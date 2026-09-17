// AIOStreams Online Streaming provider. Runs in Seanime's Goja runtime.
class Provider {
    getSettings() { return { episodeServers: ['AIOStreams'], supportsDub: false }; }
    getEpisodeServers() { return ['AIOStreams']; }
    async json(url, options) {
        const response = await fetch(url, options || {});
        if (!response.ok) throw new Error('Request failed (HTTP ' + response.status + '). Check connectivity and provider settings.');
        return await response.json();
    }
    async media(id) {
        const data = await this.json('https://graphql.anilist.co', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ query: 'query($id:Int!){Media(id:$id,type:ANIME){id format episodes status title{romaji english} nextAiringEpisode{episode}}}', variables: { id: Number(id) } })
        });
        if (!data.data || !data.data.Media) throw new Error('AniList could not resolve this anime.');
        return data.data.Media;
    }
    async search(opts) {
        if (!opts.media || !opts.media.id) throw new Error('This provider requires an AniList anime ID.');
        const m = opts.media;
        return [{ id: String(m.id), title: m.englishTitle || m.romajiTitle || opts.query, url: 'https://anilist.co/anime/' + m.id, subOrDub: 'both' }];
    }
    async findEpisodes(id) {
        const m = await this.media(id);
        if (m.status === 'NOT_YET_RELEASED' || m.status === 'CANCELLED') return [];
        let count = m.episodes || 0;
        if (m.nextAiringEpisode && m.nextAiringEpisode.episode > 0) {
            const aired = m.nextAiringEpisode.episode - 1;
            count = count > 0 ? Math.min(count, aired) : aired;
        }
        if (!count && m.format === 'MOVIE') count = 1;
        if (!count) throw new Error('AniList has no episode count for this title yet.');
        const episodes = [];
        for (let n = 1; n <= count; n++) episodes.push({
            id: JSON.stringify({ anilist: m.id, episode: n, type: m.format === 'MOVIE' ? 'movie' : 'series' }),
            number: n, url: 'https://anilist.co/anime/' + m.id, title: m.format === 'MOVIE' ? (m.title.english || m.title.romaji) : 'Episode ' + n
        });
        return episodes;
    }
    streamUrl(type, id) {
        const manifest = String($getUserPreference('manifestUrl') || '').trim();
        const match = manifest.match(/^(https?:\/\/[^?#]+)\/manifest\.json(\?[^#]*)?$/);
        if (!match) throw new Error('Paste your complete AIOStreams Stremio manifest URL in provider settings (ending in /manifest.json).');
        return match[1] + '/stream/' + type + '/' + encodeURIComponent(id) + '.json' + (match[2] || '');
    }
    async findEpisodeServer(episode, server) {
        const ref = JSON.parse(episode.id);
        // AIOStreams accepts AniList IDs and performs season/episode mapping itself.
        const id = 'anilist:' + ref.anilist + (ref.type === 'movie' ? '' : ':' + ref.episode);
        const data = await this.json(this.streamUrl(ref.type, id));
        const sources = [], selectedHeaders = {};
        let headerSignature = null;
        for (const s of (data.streams || [])) {
            if (!s.url || !/^https?:\/\//i.test(s.url)) continue;
            const headers = (s.behaviorHints && s.behaviorHints.proxyHeaders && s.behaviorHints.proxyHeaders.request) || {};
            const signature = JSON.stringify(Object.keys(headers).sort().map(k => [k, headers[k]]));
            // Seanime provides one shared header map per server, not per source.
            if (headerSignature !== null && signature !== headerSignature) continue;
            if (headerSignature === null) { headerSignature = signature; Object.assign(selectedHeaders, headers); }
            const title = [s.name, s.description || s.title].filter(Boolean).join(' — ').replace(/[\r\n]+/g, ' ').trim();
            const subtitles = (s.subtitles || []).filter(x => /^https?:\/\//i.test(x.url || '')).map((x, i) => ({ id: String(x.id || i), url: x.url, language: x.lang || 'unknown', isDefault: false }));
            sources.push({ url: s.url, type: /\.m3u8(?:[?#]|$)/i.test(s.url) ? 'm3u8' : /\.mp4(?:[?#]|$)/i.test(s.url) ? 'mp4' : 'unknown', quality: (sources.length + 1) + '. ' + (title || 'AIOStreams'), label: title || 'AIOStreams', subtitles });
        }
        if (!sources.length) throw new Error('AIOStreams returned no direct HTTP(S) streams. Check your debrid setup and filters. Torrent-only results cannot play through this provider.');
        return { server: 'AIOStreams', headers: selectedHeaders, videoSources: sources };
    }
}
