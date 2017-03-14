FROM golang:1.6-onbuild

RUN apt-get update && \
  curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
  apt-get install -y nodejs

RUN npm install -g less && \
  lessc /go/src/app/static/style/index.less /go/src/app/static/style/index.css

RUN npm install -g bower && \
  cd /go/src/app && \
  bower install --allow-root
