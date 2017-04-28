# Contributing to Data Board

Welcome!

## Development

To get started with development on Data Board, you must first set up your Go environment. Follow
the tutorial [here](https://golang.org/doc/install) to get started. Then you must also install
Node.js >= 6.10.2, npm, and bower.

Create a configuration file in JSON format (`config.json` in the project root directory is ignored
by git).

|               |        |          |
| ------------- |--------|----------|
| `EventName`   | string | Name of the event that data board is being used for i.e. "HackRPI 2016" |
| `RootURL`     | string | Root URL of the application. Default "localhost".                       |
| `Port`        | string | Port on which to run the application.                                   |
| `MongoURL`    | string | URL of Mongo database. Must begin with "mongodb://".                    |
| `DBName`      | string | Name of the database within the MongoDB.                                |
| `AuthEnabled` | bool   | Enable or disable authentication.                                       |
| `AuthURL`     | string | URL of the user authentication service. Intended to be the root URL of [Status Board](https://github.com/hack-rpi/status-board). |
| `Bus Routes`  | array  | An array of arrays of string that define the bus routes. Each bus route has a series of stops that should match exactly to the stop names in the database. Example: `[..., ["Boston", "Worchester", "Amherst"], ...]`. |

Next, set the `DB_CONFIG_FILE` environment variable to file path of the config file you created
above. Note that you can simply use `DB_CONFIG_FILE=config.json` if you only run the application
from the root of the project directory.

Next, download the development build tools and front-end libraries.

```shell
npm install
bower install
```

Now you can start Data Board by running `npm start`. The server will automatically restart when any
file changes, so you only have to refresh the web page.


## Deployment

Data Board can be deployed using Docker. A docker image is available on 
[Docker Hub](https://hub.docker.com/r/hackrpi/status-board/). You can also build it yourself.

```shell
docker build -t hackrpi/data-board .
```

Then run the docker image

```shell
docker run -d \
  -v ~/Data-Board/config.json:/go/src/app/config.json \
  -e "DB_CONFIG_FILE=/go/src/app/config.json" \
  -p 8000:8000 \
  --name db \
  hackrpi/data-board
```
