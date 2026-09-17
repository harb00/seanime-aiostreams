const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let preference='https://example.test/user/config/v/profile/manifest.json?v=mobile', requests=[], fixture;
const context={ $getUserPreference:(key)=>key === 'manifestUrl' ? preference : 'false', fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>fixture};} };
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/provider.js','utf8')+';globalThis.ProviderClass=Provider;',context);
(async()=>{
 const p=new context.ProviderClass();
 assert.equal(p.getSettings().episodeServers[0],'AIOStreams');
 const result=await p.search({media:{id:16498,englishTitle:'Attack on Titan'},query:''});assert.equal(result[0].id,'16498');
 fixture={data:{Media:{id:16498,format:'TV',episodes:25,status:'FINISHED',title:{english:'Attack on Titan'}}}};
 const episodes=await p.findEpisodes('16498');assert.equal(episodes.length,25);assert.equal(new Set(episodes.map(e=>e.id)).size,25);
 fixture={streams:[{infoHash:'torrent-only'},{url:'https://cdn.test/a.mkv',name:'HEVC'},{url:'https://cdn.test/b.m3u8',name:'HLS',subtitles:[{url:'https://cdn.test/sub.vtt',lang:'eng'}]},{url:'https://cdn.test/c.mp4',behaviorHints:{proxyHeaders:{request:{Referer:'different'}}}}]};
 const server=await p.findEpisodeServer(episodes[0],'default');assert.equal(server.videoSources.length,2);assert.equal(server.videoSources[0].type,'unknown');assert.equal(server.videoSources[1].type,'m3u8');assert.equal(server.videoSources[1].subtitles[0].language,'eng');assert.equal(requests.at(-1).url,'https://example.test/user/config/v/profile/stream/series/anilist%3A16498%3A1.json?v=mobile');
 fixture={data:{Media:{id:1,format:'TV',episodes:null,status:'RELEASING',nextAiringEpisode:{episode:9},title:{}}}};assert.equal((await p.findEpisodes('1')).length,8);
 fixture={data:{Media:{id:2,format:'MOVIE',episodes:1,status:'FINISHED',title:{english:'Film'}}}};const movies=await p.findEpisodes('2');fixture={streams:[{url:'https://cdn.test/movie.mp4'}]};await p.findEpisodeServer(movies[0],'default');assert(requests.at(-1).url.includes('/movie/anilist%3A2.json'));
 fixture={streams:[{infoHash:'x'}]};await assert.rejects(()=>p.findEpisodeServer(movies[0],'default'),/no direct/);
 preference='';await assert.rejects(()=>p.findEpisodeServer(movies[0],'default'),/manifest/);
 console.log('PASS: configuration, exact AniList IDs, episodes, airing limits, movies, variant URLs, ordered sources, headers, subtitles, actionable errors');
})().catch(e=>{console.error(e);process.exitCode=1});
