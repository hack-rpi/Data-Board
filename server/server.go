package server

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
)

// The Server struct encapsulates the server information, handler methods, and a pointer to the
// active database connection
type Server struct {
	port      string
	staticDir string
	db        *DataBase
	config    *Config
}

// NewServer creates a Server struct from a given port and static directory
func NewServer(port, staticDir string) *Server {
	c, err := LoadConfig()
	if err != nil {
		log.Println(err)
	}
	db := NewDataBase(c.MongoURL, c.DBName)
	s := Server{port, staticDir, db, c}
	return &s
}

// Start starts the HTTP server and waits for connections
func (s *Server) Start() {
	http.Handle("/", http.FileServer(http.Dir(s.staticDir)))
	http.HandleFunc("/libs/", s.libHandler)
	http.HandleFunc("/data/", s.dataHandler)
	fmt.Printf("Starting server on port %s\n", s.port)
	http.ListenAndServe(s.port, nil)
}

func (s *Server) libHandler(w http.ResponseWriter, r *http.Request) {
	const path = "/libs/"
	if len(path) >= len(r.URL.Path) {
		return
	}
	lib := r.URL.Path[len(path):]
	var fd []byte
	if lib == "d3" {
		fd, _ = ioutil.ReadFile("./bower_components/d3.min.js")
	} else if lib == "jquery" {
		fd, _ = ioutil.ReadFile("./bower_components/jquery/dist/jquery.min.js")
	} else {
		// error state
	}
	w.Write(fd)
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
	}
}
