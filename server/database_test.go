package server

import "testing"
import "os"
import "fmt"
import "encoding/json"

var DB *DataBase
var C *Config

func TestMain(m *testing.M) {
	// setup
	var err error
	C, err = LoadConfig()
	if err != nil {
		panic(err)
	}
	DB = NewDataBase(C.MongoURL, C.DBName)
	// run tests
	ec := m.Run()
	// tear down
	DB.Close()
	// exit
	os.Exit(ec)
}

func TestBusRouteStatus(t *testing.T) {
	res := DB.GetBusRouteStatus(C.BusRoutes)
	r, err := json.Marshal(&res)
	if err != nil {
		panic(err)
	}
	fmt.Println(res)
	fmt.Println(string(r))
}
