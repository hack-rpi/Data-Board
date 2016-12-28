package server

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/cbroglie/mustache"
	"github.com/gorilla/context"
	"github.com/gorilla/sessions"
)

// The Server struct encapsulates the server information, handler methods, and a pointer to the
// active database connection
type Server struct {
	port      string
	staticDir string
	db        *DataBase
	config    *Config
	store     *sessions.CookieStore
}

// NewServer creates a Server struct from a given port and static directory
func NewServer(port, staticDir string) *Server {
	c, err := LoadConfig()
	if err != nil {
		log.Println(err)
	}
	db := NewDataBase(c.MongoURL, c.DBName)
	store := sessions.NewCookieStore([]byte("secret"))
	s := Server{port, staticDir, db, c, store}
	return &s
}

// Start starts the HTTP server and waits for connections
func (s *Server) Start() {
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.staticDir))))

	mustacheHandler := http.HandlerFunc(s.mustache)
	http.Handle("/", s.flashMiddleware(mustacheHandler))

	http.HandleFunc("/libs/", s.libHandler)
	http.HandleFunc("/login", s.loginHandler)
	http.HandleFunc("/data/", s.dataHandler)
	fmt.Printf("Starting server on port %s\n", s.port)
	http.ListenAndServe(s.port, context.ClearHandler(http.DefaultServeMux))
}

func (s *Server) mustache(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" {
		path = "/index"
	}
	path = fmt.Sprintf("./views%s.mustache", path)
	session, err := s.store.Get(r, "flash")
	if err != nil {
		log.Fatalln(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	flashes := session.Flashes()
	context := make(map[string]string)
	for _, f := range flashes {
		context["flash"] = f.(string)
	}
	resp, err := mustache.RenderFileInLayout(path, "./views/layouts/default.mustache", context)
	if err != nil {
		log.Fatalln(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	session.Save(r, w)
	w.Write([]byte(resp))
}

func (s *Server) flashMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

func (s *Server) libHandler(w http.ResponseWriter, r *http.Request) {
	const path = "/libs/"
	if len(path) >= len(r.URL.Path) {
		return
	}
	lib := r.URL.Path[len(path):]
	var fd []byte
	if lib == "d3" {
		fd, _ = ioutil.ReadFile("./bower_components/d3/d3.min.js")
	} else if lib == "jquery" {
		fd, _ = ioutil.ReadFile("./bower_components/jquery/dist/jquery.min.js")
	} else {
		http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
		return
	}
	w.Write(fd)
}

func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		s.flashMiddleware(http.HandlerFunc(s.mustache)).ServeHTTP(w, r)
		return
	}
	session, err := s.store.Get(r, "flash")
	if err != nil {
		log.Fatalln(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")
	resp, err := http.PostForm(s.config.AuthURL+"/api/login", url.Values{"email": {username},
		"password": {password}})
	if err != nil {
		log.Fatalln(err)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	defer resp.Body.Close()
	var msg map[string]string
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalln(err)
		session.AddFlash("Something went wrong!")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	dec := json.NewDecoder(strings.NewReader(string(body)))
	if err := dec.Decode(&msg); err != nil {
		log.Fatalln(err)
		session.AddFlash("Something went wrong!")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	if msg["status"] == "error" && msg["message"] == "Unauthorized" {
		session.AddFlash("Invalid username or password.")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	fmt.Println(msg)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) dataHandler(w http.ResponseWriter, r *http.Request) {
	const path = "/data/"
	if len(path) >= len(r.URL.Path) {
		return
	}
	resource := r.URL.Path[len(path):]
	switch resource {
	case "users/count":
		fmt.Fprintf(w, "%d", s.db.CountUsers())
	case "users/accepted":
		fmt.Fprintf(w, "%d", s.db.CountAccepted())
	case "users/confirmed":
		fmt.Fprintf(w, "%d", s.db.CountConfirmed())
	case "users/checkedin":
		fmt.Fprintf(w, "%d", s.db.CountCheckedIn())
	case "users/busStatus":
		resp, err := json.Marshal(s.db.GetBusRouteStatus(s.config.BusRoutes))
		if err != nil {
			log.Fatal(err)
		} else {
			fmt.Fprint(w, string(resp))
		}
	case "users/schools":
		if resp, err := json.Marshal(s.db.GetSchools()); err != nil {
			log.Fatal(err)
		} else {
			fmt.Fprintf(w, string(resp))
		}
	default:
		http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
	}
}
