package server

import "net/http"

// Route encapsulates the parameters for a route
type Route struct {
	server  *Server
	handler http.HandlerFunc
	auth    bool
}

// NewRoute creates and returns a new Route object
func NewRoute(server *Server, handler http.HandlerFunc, auth bool) *Route {
	r := Route{server, handler, auth}
	return &r
}

// Handle routes an incoming request to the handler
func (route *Route) Handle(w http.ResponseWriter, r *http.Request) {
	if route.auth {
		if route.server.isLoggedIn(r) {
			route.handler(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		}
		return
	}
	route.handler(w, r)
}
