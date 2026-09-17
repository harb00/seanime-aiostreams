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

- Uses the anime's exact AniList ID, without title matching.
- Retrieves episode counts and next-airing information from AniList.
- Requests `/stream/series/anilist:ID:EPISODE.json` (or `/stream/movie/anilist:ID.json`) from the configured AIOStreams manifest base. AIOStreams handles its own ID mapping.
- Preserves path-based variants and query parameters, result order, descriptions and subtitles.
- Returns HTTP(S) sources to Tenji's native player, including MKV URLs as type `unknown`.

Both Seanime Server and Tenji can run on the iPhone; your AIOStreams service must still be reachable. No separate desktop Seanime server is needed.

## Limitations and validation

Node regression tests cover search IDs, episode lists, airing limits, movies, variants, sources, headers, subtitles and error handling. Live AniList metadata lookup was verified. **End-to-end execution in iOS Seanime/Goja and playback still require device testing.**

Only direct HTTP(S) streams are supported. Raw torrents, magnets, external player links and raw Usenet results are omitted. Configure AIOStreams to return playable direct/debrid URLs. Titles with no known episode count and no next-airing data produce an explicit error. Completed series rely on AniList episode counts; this is not a per-episode availability check.

Seanime has one shared header map per episode server. Sources requiring different request headers from the first playable source are omitted. This extension does not force dubbed audio or use a separate dub search. Tenji controls the displayed player UI; AIOStreams' plugin panel/badges are not included.

Run tests with `node test.cjs`.

### Troubleshooting (v0.1.1)

Seanime can replace provider stream errors with a generic "no source found". In the provider preferences, temporarily enable **Diagnostic: test episode 1 when loading episodes**, save, and reopen the anime. This moves the check into episode-list loading so the actual error appears in Tenji's episode-list error/log. Disable the switch after troubleshooting. Diagnostics does not publish or transmit your configuration elsewhere; URLs are redacted from its error text. Standard `stremio://` manifest links are also accepted and converted to HTTPS.
