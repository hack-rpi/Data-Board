package server

import (
	"log"

	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

// The DataBase struct encapsulates connection information, a pointer to the active connection, and
// wrapper methods on frequent queries
type DataBase struct {
	db      *mgo.Database
	session *mgo.Session
	uri     string
	dbName  string
}

// NewDataBase creates a DataBase struct from a uri and database name within that MongoDB
func NewDataBase(uri, dbName string) *DataBase {
	session, err := mgo.Dial(uri)
	if err != nil {
		log.Panicf("Could not connect to database: %s", uri)
	}
	db := session.DB(dbName)
	database := DataBase{db, session, uri, dbName}
	return &database
}

// Close ends the connection with the database server
func (db *DataBase) Close() {
	db.session.Close()
}

// CountUsers returns the number of documents in the users collection
func (db *DataBase) CountUsers() int {
	res, _ := db.db.C("users").Count()
	return res
}

// CountAccepted returns the number users who have accepted the invite
func (db *DataBase) CountAccepted() int {
	res, _ := db.db.C("users").Find(bson.M{"settings.accepted.flag": true}).Count()
	return res
}

// CountConfirmed returns the number of users who have confirmed their attendence
func (db *DataBase) CountConfirmed() int {
	res, _ := db.db.C("users").Find(bson.M{"settings.confirmed.flag": true}).Count()
	return res
}

// CountCheckedIn returns the number of users who checked-in
func (db *DataBase) CountCheckedIn() int {
	res, _ := db.db.C("users").Find(bson.M{"settings.checked_in": true}).Count()
	return res
}

// The BusRouteStatus struct holds the status of entire bus route and the status of each stop on the
// route
type BusRouteStatus struct {
	RouteID   int
	Accepted  int
	Confirmed int
	Rejected  int
	Total     int
	Stops     []BusStopStatus
}

// The BusStopStatus struct holds the counts for the number of poeple on a stop
type BusStopStatus struct {
	StopName  string
	Accepted  int
	Confirmed int
	Rejected  int
	Total     int
}

// GetBusRouteStatus aggregates the bus routes and creates a list of the status of each bus route
func (db *DataBase) GetBusRouteStatus(routes [][]string) []BusRouteStatus {
	pipeline := []bson.M{{
		"$group": bson.M{
			"_id": bson.M{
				"Stop":           "$settings.accepted.travel.method",
				"ConfirmedOnBus": "$settings.confirmed.travel.accepted",
				"Confirmed":      "$settings.confirmed.flag",
			},
			"total": bson.M{
				"$sum": 1,
			},
		},
	}}
	pipe := db.db.C("users").Pipe(pipeline)
	var res []map[string]interface{}
	err := pipe.All(&res)
	if err != nil {
		panic(err)
	}
	buses := make([]BusRouteStatus, len(routes))
	for i, route := range routes {
		stops := make([]BusStopStatus, len(route))
		buses[i] = BusRouteStatus{i, 0, 0, 0, 0, stops}
		for k, stop := range route {
			acceptF := func(d map[string]interface{}) bool {
				m, _ := d["_id"].(map[string]interface{})
				return m["Stop"] == stop && m["Confirmed"] == nil
			}
			confirmF := func(d map[string]interface{}) bool {
				m, _ := d["_id"].(map[string]interface{})
				return m["Stop"] == stop && m["Confirmed"] == true && m["ConfirmedOnBus"] == true
			}
			rejectF := func(d map[string]interface{}) bool {
				m, _ := d["_id"].(map[string]interface{})
				return m["Stop"] == stop && (m["Confirmed"] == false || m["ConfirmedOnBus"] == false)
			}
			stopAccepted := find(res, acceptF)
			stopConfirmed := find(res, confirmF)
			stopRejected := find(res, rejectF)
			stops[k] = BusStopStatus{stop, zeroIfNil(stopAccepted), zeroIfNil(stopConfirmed),
				zeroIfNil(stopRejected), zeroIfNil(stopAccepted) + zeroIfNil(stopConfirmed)}
			buses[i].Accepted += stops[k].Accepted
			buses[i].Confirmed += stops[k].Confirmed
			buses[i].Rejected += stops[k].Rejected
			buses[i].Total += stops[k].Total
		}
	}
	return buses
}

type predicate func(map[string]interface{}) bool

func find(slice []map[string]interface{}, pred predicate) *map[string]interface{} {
	for _, d := range slice {
		if pred(d) {
			return &d
		}
	}
	return nil
}

func zeroIfNil(d *map[string]interface{}) int {
	if d != nil {
		return (*d)["total"].(int)
	}
	return 0
}

// GetSchools returns a map of unique schools to the number of people registered from each school
func (db *DataBase) GetSchools() []map[string]interface{} {
	pipeline := []bson.M{{
		"$group": bson.M{
			"_id": "$profile.school",
			"count": bson.M{
				"$sum": 1,
			},
		},
	}}
	pipe := db.db.C("users").Pipe(pipeline)
	var res []map[string]interface{}
	err := pipe.All(&res)
	if err != nil {
		log.Fatal(err)
		return nil
	}
	// schools := make(map[string]int)
	// for _, school := range res {
	// 	if name, found := school["_id"].(string); found {
	// 		count := school["count"].(int)
	// 		schools[name] = count
	// 	}
	// }
	// return schools
	return res
}
