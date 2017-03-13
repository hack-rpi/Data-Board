package main

import "github.com/mpoegel/Data-Board/server"

func main() {
	server := server.NewServer(":8000", "./static")
	server.Start()
}
