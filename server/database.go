package server

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

// The DataBase struct encapsulates connection information, a pointer to the active connection, and
// wrapper methods on frequent queries
type DataBase struct {
	db     *mgo.Database
	uri    string
	dbName string
}

// NewDataBase creates a DataBase struct from a uri and database name within that MongoDB
func NewDataBase(uri, dbName string) *DataBase {
	session, err := mgo.Dial("localhost:27017")
	if err != nil {
		panic("Could not connect to database!")
	}
	db := session.DB("status-board")
	database := DataBase{db, uri, dbName}
	return &database
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

type BusRouteStatus struct {
	routeID   int
	accepted  int
	confirmed int
	rejected  int
	total     int
	stops     []BusStopStatus
}

type BusStopStatus struct {
	stopName  string
	accepted  int
	confirmed int
	rejected  int
	total     int
}

type BusStopPipeline struct {
	_id struct {
		Stop           string
		ConfirmedOnBus interface{}
		Confirmed      interface{}
	}
	total int
}

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
	var res []BusStopPipeline
	err := pipe.All(&res)
	if err != nil {
		panic(err)
	}
	buses := make([]BusRouteStatus, len(routes))
	for i, route := range routes {
		stops := make([]BusStopStatus, len(route))
		buses[i] = BusRouteStatus{i, 0, 0, 0, 0, stops}
		for k, stop := range route {
			acceptF := func(d BusStopPipeline) bool { return d._id.Stop == stop && d._id.Confirmed == nil }
			confirmF := func(d BusStopPipeline) bool { return d._id.Stop == stop && d._id.Confirmed == nil }
			rejectF := func(d BusStopPipeline) bool { return d._id.Stop == stop && d._id.Confirmed == nil }
			stopAccepted := find(res, acceptF)
			stopConfirmed := find(res, confirmF)
			stopRejected := find(res, rejectF)
			stops[k] = BusStopStatus{stop, zeroIfNil(stopAccepted), zeroIfNil(stopConfirmed),
				zeroIfNil(stopRejected), zeroIfNil(stopAccepted) + zeroIfNil(stopConfirmed)}
			buses[i].accepted += stops[k].accepted
			buses[i].confirmed += stops[k].confirmed
			buses[i].rejected += stops[k].rejected
			buses[i].total += stops[k].total
		}
	}
	return buses
}

type predicate func(BusStopPipeline) bool

func find(slice []BusStopPipeline, pred predicate) *BusStopPipeline {
	for _, d := range slice {
		if pred(d) {
			return &d
		}
	}
	return nil
}

func zeroIfNil(d *BusStopPipeline) int {
	if d != nil {
		return d.total
	}
	return 0
}
