package server

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"log"
	"os"
	"strings"
)

// The Config struct represents the server configuration
type Config struct {
	RootURL   string
	Port      string
	MongoURL  string
	DBName    string
	AuthURL   string
	BusRoutes [][]string
}

// LoadConfig loads the configuration file specified in the DB_CONFIG_FILE environment variable
func LoadConfig() (*Config, error) {
	fn := os.Getenv("DB_CONFIG_FILE")
	deflt := Config{"", "", "", "", "", make([][]string, 0)}
	if fn == "" {
		return &deflt, errors.New("DB_CONFIG_FILE not defined")
	}
	content, err := ioutil.ReadFile(fn)
	if err != nil {
		return &deflt, err
	}
	dec := json.NewDecoder(strings.NewReader(string(content)))
	if err := dec.Decode(&deflt); err != nil {
		log.Println(string(content))
		return &deflt, err
	}
	return &deflt, nil
}
