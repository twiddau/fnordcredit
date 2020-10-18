# fnordcredit-entropia
Open source credit system with entropia flavour

Innovative, easy to use credit system for multiple users that comes with an intuitive design: Create an account and charge or discharge your credit.

## Development
fnordcredit is written in Javascript/Node.js/jQuery/rethinkDB.

To start a local development server, have [rethinkDB](https://rethinkdb.com/) installed and running, then do the following:
```bash
	git clone https://github.com/entropia/fnordcredit.git
	cd fnordcredit
	npm install
	cp config.js.example config.js
	node tools/dbInit.js
```
As last step, start the local development server using ```npm start``` and point your browser to http://127.0.0.1:8000.

## With Docker
### Using Docker Compose file
#### Build and start containers
```docker-compose up --build 
```

#### Setup database
```docker exec $(docker ps -aq --filter ancestor=fnordcredit_fnordcredit -l) node /srv/fnordcredit/tools/dbInit.js
docker restart $(docker ps -aq --filter ancestor=fnordcredit_fnordcredit -l)
```


### Traditional way
#### Create network
```bash
docker network create fnordcredit
```

#### Deploy Rethinkdb
```bash
docker run -d \
	--name fnordcredit-rethinkdb \
	--network fnordcredit \
	-v /srv/fnordcredit/db:/data \
	rethinkdb
```

#### Create config file
Copy config-docker.js.example to ```/srv/fnordcredit/config.js``` on the host system

#### Deploy Fnordcredit
```bash
# create container
docker run -d \
	--name fnordcredit \
	--network fnordcredit \
	--link fnordcredit-rethinkdb:rethinkdb \
	-v /srv/fnordcredit/config.js:/srv/fnordcredit/config.js:ro \
	-v /srv/fnordcredit/img:/srv/fnordcredit/static/img:ro \
	-e 8000:8000 \
	entropia/fnordcredit

# setup DB
docker exec fnordcredit node /srv/fnordcredit/tools/dbInit.js

docker restart fnordcredit
```

## Customization
There is no admin interface. Customization can be done via  RethinkDB's Web Interface.

### Products
Insert new products via RethinkDB query.
Example:
```json
{
	"description":"Club-Mate",
	"ean":"4029764001807",
	"image":"/img/clubmate.png",
	"name":"clubmate",
	"order":10,
	"price":1
}
```

To add a product:
```js
r.db("fnordcredit").table("products").insert(
	{<Object>}
);
```

Product images can be uploaded to ```static/img```.

## License
Copyright © 2014 
	silsha &lt;hallo@silsha.me&gt;
	Twi &lt;twi@entropia.de&gt;
	xuio &lt;xuio@entropia.de&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
