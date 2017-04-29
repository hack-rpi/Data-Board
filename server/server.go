package server

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
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
	os.Mkdir("temp", 0766)
	store := sessions.NewCookieStore([]byte("secret"))
	s := Server{port, staticDir, db, c, store}
	return &s
}

// Start starts the HTTP server and waits for connections
func (s *Server) Start() {
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.staticDir))))

	mustacheHandler := http.HandlerFunc(NewRoute(s, s.mustache, false).Handle)
	http.Handle("/", s.flashMiddleware(mustacheHandler))

	http.HandleFunc("/libs/", NewRoute(s, s.libHandler, false).Handle)
	http.HandleFunc("/login", NewRoute(s, s.loginHandler, false).Handle)
	http.HandleFunc("/logout", NewRoute(s, s.logoutHandler, false).Handle)

	http.HandleFunc("/data/users/count", NewRoute(s, s.dataUsersCountHandler, true).Handle)
	http.HandleFunc("/data/users/accepted", NewRoute(s, s.dataUsersAcceptedHandler, true).Handle)
	http.HandleFunc("/data/users/confirmed", NewRoute(s, s.dataUsersConfirmedHandler, true).Handle)
	http.HandleFunc("/data/users/checkedin", NewRoute(s, s.dataUsersCheckedInHandler, true).Handle)
	http.HandleFunc("/data/users/busStatus", NewRoute(s, s.dataUsersBusRoutesHandler, true).Handle)
	http.HandleFunc("/data/users/schools", NewRoute(s, s.dataUsersSchoolsHandler, true).Handle)
	http.HandleFunc("/data/users/why", NewRoute(s, s.dataUsersWhyHandler, true).Handle)
	http.HandleFunc("/data/users/interestAreas",
		NewRoute(s, s.dataUsersInterestAreasHandler, true).Handle)
	http.HandleFunc("/data/resumes/gradYear", NewRoute(s, s.dataResumesGradYear, true).Handle)

	fmt.Printf("Starting server on port %s\n", s.port)
	http.ListenAndServe(s.port, context.ClearHandler(http.DefaultServeMux))
}

func (s *Server) isLoggedIn(r *http.Request) bool {
	session, err := s.store.Get(r, "flash")
	if err != nil {
		return false
	}
	userID, ok1 := session.Values["userID"].(string)
	accessToken, ok2 := session.Values["accessToken"].(string)
	if ok1 && ok2 && s.db.VerifyToken(s.config.AuthURL, userID, accessToken) {
		return true
	}
	return false
}

func (s *Server) mustache(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" {
		path = "/index"
	}
	path = fmt.Sprintf("./views%s.mustache", path)
	session, err := s.store.Get(r, "flash")
	session.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
	}
	if err != nil {
		log.Fatalln(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	flashes := session.Flashes()
	context := make(map[string]interface{})
	for _, f := range flashes {
		context["flash"] = f.(string)
	}
	userID, ok1 := session.Values["userID"].(string)
	accessToken, ok2 := session.Values["accessToken"].(string)
	if ok1 && ok2 && s.db.VerifyToken(s.config.AuthURL, userID, accessToken) {
		context["loggedIn"] = true
	} else {
		context["loggedIn"] = false
	}
	resp, err := mustache.RenderFileInLayout(path, "./views/layouts/default.mustache", context)
	if err != nil {
		log.Println(err)
		http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
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
		log.Println(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")
	resp, err := http.PostForm(s.config.AuthURL+"/api/login", url.Values{"email": {username},
		"password": {password}})
	if err != nil {
		log.Println(err)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	defer resp.Body.Close()
	var msg map[string]interface{}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Println(err)
		session.AddFlash("Something went wrong!")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	dec := json.NewDecoder(strings.NewReader(string(body)))
	if err := dec.Decode(&msg); err != nil {
		log.Println(err)
		fmt.Println(string(body))

		session.AddFlash("Something went wrong!")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	if msg["status"] == "error" && msg["message"].(string) == "Unauthorized" {
		session.AddFlash("Invalid username or password.")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	userID := msg["data"].(map[string]interface{})["userId"]
	accessToken := msg["data"].(map[string]interface{})["authToken"]
	session.Values["userID"] = userID
	session.Values["accessToken"] = accessToken
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	session, err := s.store.Get(r, "flash")
	if err != nil {
		log.Fatalln(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	userID, ok1 := session.Values["userID"].(string)
	accessToken, ok2 := session.Values["accessToken"].(string)
	if ok1 && ok2 && s.db.VerifyToken(s.config.AuthURL, userID, accessToken) {
		session.AddFlash("You have been logged out.")
	} else {
		session.AddFlash("You are not logged in.")
	}
	session.Values["userID"] = ""
	session.Values["accessToken"] = ""
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) dataUsersCountHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "%d", s.db.CountUsers())
}

func (s *Server) dataUsersAcceptedHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "%d", s.db.CountAccepted())
}

func (s *Server) dataUsersConfirmedHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "%d", s.db.CountConfirmed())
}

func (s *Server) dataUsersCheckedInHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "%d", s.db.CountCheckedIn())
}

func (s *Server) dataUsersBusRoutesHandler(w http.ResponseWriter, r *http.Request) {
	resp, err := json.Marshal(s.db.GetBusRouteStatus(s.config.BusRoutes))
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	} else {
		fmt.Fprint(w, string(resp))
	}
}

func (s *Server) dataUsersSchoolsHandler(w http.ResponseWriter, r *http.Request) {
	if resp, err := json.Marshal(s.db.GetSchools()); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	} else {
		fmt.Fprintf(w, string(resp))
	}
}

func (s *Server) dataUsersWhyHandler(w http.ResponseWriter, r *http.Request) {
	if resp, err := json.Marshal(s.db.GetWhy()); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	} else {
		fmt.Fprintf(w, string(resp))
	}
}

func (s *Server) dataUsersInterestAreasHandler(w http.ResponseWriter, r *http.Request) {
	if resp, err := json.Marshal(s.db.GetInterestAreas()); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	} else {
		fmt.Fprintf(w, string(resp))
	}
}

func (s *Server) dataResumesGradYear(w http.ResponseWriter, r *http.Request) {
	filename := s.db.BuildResumes()
	w.Header().Set("Content-type", "application/zip")
	http.ServeFile(w, r, filename)
	defer os.Remove(filename)
}
