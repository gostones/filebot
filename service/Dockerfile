FROM golang:1.12.6-alpine3.9 as builder
RUN apk add --no-cache git

RUN mkdir /app
ADD . /app/
WORKDIR /app
RUN go mod download
RUN go build -o server ./cmd/server
# RUN CGO_ENABLED=0 GOOS=linux go install ./cmd/...

CMD ["/app/server"]