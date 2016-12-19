package server

import (
	"fmt"
	"io/ioutil"
	"net/http"
)

type Server struct {
	port      string
	staticDir string
}

func NewServer(port, staticDir string) *Server {
	s := Server{port, staticDir}
	return &s
}

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
		fmt.Fprintf(w, "%d", CountUsers())
	case "users/accepted":
		fmt.Fprintf(w, "%d", 0)
	case "users/confirmed":
		fmt.Fprintf(w, "%d", 0)
	case "users/checkedin":
		fmt.Fprintf(w, "%d", 0)
	}
}
