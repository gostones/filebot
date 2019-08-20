FROM golang:1.12.6-alpine3.9 as builder

RUN apk add --no-cache git

WORKDIR /app
COPY go.mod .
COPY go.sum .

ENV GO111MODULE on
ENV GOBIN /go/bin

RUN go mod download

#
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go install ./cmd/...

CMD ["/go/bin/server"]