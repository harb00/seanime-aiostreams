// Copy into Seanime's internal/extension_repo and run only TestAIOStreams.
// Uses the actual provider pool, fetch binding, promise exporter and Go types.
package extension_repo

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/rs/zerolog"
	"seanime/internal/events"
	"seanime/internal/extension"
	hibike "seanime/internal/extension/hibike/onlinestream"
	"seanime/internal/goja/goja_runtime"
)

func aioProvider(t *testing.T, manifest string) hibike.Provider {
	t.Helper()
	zerolog.SetGlobalLevel(zerolog.Disabled) // Network trace logs include private URLs.
	source, err := os.ReadFile(os.Getenv("AIOSTREAMS_PROVIDER_SOURCE"))
	if err != nil {
		t.Fatal(err)
	}
	logger := zerolog.New(io.Discard)
	ext := &extension.Extension{ID: "test-aiostreams", Name: "AIOStreams integration test", Version: "0.1.2", Language: extension.LanguageJavascript, Type: extension.TypeOnlinestreamProvider, Payload: string(source), UserConfig: &extension.UserConfig{}, SavedUserConfig: &extension.SavedUserConfig{Values: map[string]string{"manifestUrl": manifest, "diagnostics": "false"}}}
	p, impl, err := NewGojaOnlinestreamProvider(ext, ext.Language, &logger, goja_runtime.NewManager(&logger), events.NewMockWSEventManager(&logger))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { impl.store.Stop(); impl.scheduler.Stop() })
	return p
}

func TestAIOStreamsRuntime(t *testing.T) {
	var requested string
	status := 200
	body := `{"streams":[{"url":"https://media.example/video.mkv","name":"Test"}]}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		io.WriteString(w, body)
	}))
	defer server.Close()
	p := aioProvider(t, server.URL+"/private/manifest.json")
	ep := &hibike.EpisodeDetails{ID: `{"anilist":182205,"mal":59970,"episode":1,"type":"series"}`, Number: 1}
	source, err := p.FindEpisodeServer(ep, "AIOStreams")
	if err != nil {
		t.Fatal(err)
	}
	if requested != "/private/stream/series/mal:59970:1.json" || len(source.VideoSources) != 1 || source.VideoSources[0].URL != "https://media.example/video.mkv" {
		t.Fatal("incorrect mapped request or exported source")
	}
	status = 403
	_, err = p.FindEpisodeServer(ep, "AIOStreams")
	if err == nil || !strings.Contains(err.Error(), "HTTP 403") || strings.Contains(err.Error(), "map[]") || strings.Contains(err.Error(), server.URL) {
		t.Fatalf("error did not survive Goja safely: %v", err)
	}
	status = 200
	body = `{"streams":[]}`
	_, err = p.FindEpisodeServer(ep, "AIOStreams")
	if err == nil || !strings.Contains(err.Error(), "no direct HTTP(S)") {
		t.Fatalf("missing empty result error: %v", err)
	}
}

func TestAIOStreamsLive(t *testing.T) {
	path := os.Getenv("AIOSTREAMS_MANIFEST_FILE")
	if path == "" {
		t.Skip("set AIOSTREAMS_MANIFEST_FILE to opt into live requests")
	}
	manifest, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	p := aioProvider(t, strings.TrimSpace(string(manifest)))
	for _, id := range []string{"171627", "182205"} {
		episodes, err := p.FindEpisodes(id)
		if err != nil {
			t.Fatal(err)
		}
		if len(episodes) == 0 {
			t.Fatalf("no episodes for %s", id)
		}
		var ref struct {
			Mal int `json:"mal"`
		}
		if err = json.Unmarshal([]byte(episodes[0].ID), &ref); err != nil || ref.Mal == 0 {
			t.Fatal("missing MAL mapping")
		}
		source, err := p.FindEpisodeServer(episodes[0], "AIOStreams")
		if err != nil {
			t.Fatal(err)
		}
		if len(source.VideoSources) == 0 {
			t.Fatalf("no sources for %s", id)
		}
		t.Logf("AniList %s: %d episodes, MAL %d, %d video sources", id, len(episodes), ref.Mal, len(source.VideoSources))
	}
}
