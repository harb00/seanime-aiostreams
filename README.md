# AIOStreams Online for Seanime / Tenji

A standalone JavaScript **onlinestream-provider** for Seanime, including the mobile server used by Tenji. It avoids desktop plugin UI and OS-specific download-directory APIs. No app modifications required.

## Installation

In **Seanime Server → Extensions → Install from URL**, paste:

```
https://raw.githubusercontent.com/harb00/seanime-aiostreams/main/manifest.json
```

Install **AIOStreams Online (harb00)**, open its configuration/preferences, and fill in **AIOStreams manifest URL**. Use your personal **Stremio** manifest from AIOStreams (ending in `/manifest.json`), not the Seanime plugin manifest. Save it locally; never publish your personal URL.

In Tenji, connect to your mobile Seanime server, open an anime, select **Online Streaming**, and select **AIOStreams Online (harb00)**. Refresh the provider list or restart Tenji if it was already open.

## How it works

- Uses the anime's exact AniList ID to retrieve its MyAnimeList ID, without title matching.
- Retrieves episode counts and next-airing information from AniList.
- Requests `/stream/series/mal:ID:EPISODE.json` (or `/stream/movie/mal:ID.json`) from the configured AIOStreams manifest base. AIOStreams handles season/episode mapping. Its built-in indexers support `mal:` IDs; sending `anilist:` can silently return no streams.
- Preserves path-based variants and query parameters, result order, descriptions and subtitles.
- Returns HTTP(S) sources to Tenji's native player, including MKV URLs as type `unknown`.

Both Seanime Server and Tenji can run on the iPhone; your AIOStreams service must still be reachable. No separate desktop Seanime server is needed.

## Limitations and validation

Node regressions and integration tests against Seanime v3.10.2's actual Goja runtime pass, including live AniList and AIOStreams requests. Eight of nine sampled titles returned sources; two media sources also returned valid Matroska data over HTTP range requests. See [test details and reproduction steps](tests/README.md). **Native iPhone decoding and playback still require device testing.**

Only direct HTTP(S) streams are supported. Raw torrents, magnets, external player links and raw Usenet results are omitted. Configure AIOStreams to return playable direct/debrid URLs. Titles with no known episode count and no next-airing data produce an explicit error. Completed series rely on AniList episode counts; this is not a per-episode availability check.

Seanime has one shared header map per episode server. Sources requiring different request headers from the first playable source are omitted. This extension does not force dubbed audio or use a separate dub search. Tenji controls the displayed player UI; AIOStreams' plugin panel/badges are not included.

Run tests with `node test.cjs`.

### Troubleshooting

Version 0.1.2 fixes empty results caused by requesting `anilist:` stream IDs that the configured stream addons do not support. AIOStreams' `/api/v1/anime?idType=anilistId&idValue=...` mapping endpoint supports AniList; this does not mean every stream addon accepts the `anilist:` prefix. Update the extension and refresh the episode list. Old cached episode IDs are also supported.

Seanime can replace provider stream errors with a generic "no source found" and export JavaScript Error objects as `map[]`. The provider logs redacted error text to the Seanime server log and rejects public calls with a string so that the message survives export.

Errors are logged automatically in the **Seanime server log** as `Stream lookup failed` or `Episode list failed`, with URLs redacted from the provider's error text. Standard `stremio://` manifest links are also accepted and converted to HTTPS.

Version 0.1.3 removes the temporary diagnostic setting and episode preflight check. Provider settings now contain only the AIOStreams manifest URL.
