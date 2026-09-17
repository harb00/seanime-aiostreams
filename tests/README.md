# Integration checks

`node test.cjs` runs the provider regressions without network access, including
MAL IDs that differ from AniList IDs, season/episode numbers, old cached episode
IDs, metadata-only episode listing, HTTP errors, and redaction.

`seanime_integration_test.go` exercises Seanime's actual extension runtime rather
than mocking Goja or its fetch binding. Use a disposable Seanime v3.10.2 checkout:

```sh
provider_dir=/absolute/path/to/seanime-aiostreams
seanime_dir=/absolute/path/to/seanime
cp "$provider_dir/tests/seanime_integration_test.go" \
  "$seanime_dir/internal/extension_repo/aiostreams_integration_test.go"
AIOSTREAMS_PROVIDER_SOURCE="$provider_dir/provider.js" \
  go -C "$seanime_dir" test ./internal/extension_repo -run '^TestAIOStreams' -count=1 -v
```

The default test uses a local HTTP server to verify the mapped request, Go source
conversion, and readable errors. For the optional live test, also set
`AIOSTREAMS_MANIFEST_FILE` to a local file containing your private Stremio manifest
URL. Do not commit that file. The live test resolves AniList metadata and sources
for Reze (171627) and Slime season 4 (182205). It does not launch a video player.

Both `TestAIOStreamsRuntime` and `TestAIOStreamsLive` passed against Seanime
v3.10.2 (`9bdd052`) on Linux using Go 1.26.2. The live test exported 66 movie
sources and 27 episode sources through Seanime's real Goja provider adapter.

## Live checks on 2026-09-17

The configured instance advertised `mal`, `kitsu`, `tt`, `imdb`, `tvdb`, and `tmdb`
stream prefixes, but not `anilist`. Its public anime mapping API successfully
resolved `anilistId=171627` to `malId=57555`; mapping support and stream resource
support are separate. Original AniList stream requests returned
`{"streams":[]}`. The updated provider produced:

| AniList ID | Episodes | HTTP sources for episode 1 |
| --- | ---: | ---: |
| 171627 | 1 | 66 |
| 182205 | 22 | 27 |
| 182300 | 12 | 25 |
| 186497 | 14 | 19 |
| 178789 | 12 | 27 |
| 147105 | 13 | 30 |
| 20954 | 1 | 46 |
| 189987 | 12 | 22 |
| 21579 | 1 | 0 |

Counts depend on the instance's configured indexers, filters, and availability.
For 21579, direct movie/MAL and series/Kitsu requests also returned zero results.

Separate `Range: bytes=0-1023` probes of the first sources for 171627 and 182205
both returned HTTP 206, `video/x-matroska`, and the Matroska/EBML header
`1a45dfa3`. This verifies actual media transport, not just stream URL discovery.

Tenji at `c8f8db6` passed its two `tests/online-source.test.ts` tests, and a direct
check of `toSourceFromOnlineStream` accepted the provider's `unknown`/MKV type as
an HTTP source. Native iPhone decoding and playback were not exercised.
