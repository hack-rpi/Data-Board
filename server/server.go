package server

import "net/http"
import "fmt"

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
	fmt.Printf("Starting server on port %s\n", s.port)
	http.ListenAndServe(s.port, nil)
}
