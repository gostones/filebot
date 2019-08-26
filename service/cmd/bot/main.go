package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"os"
	"os/user"
	"path/filepath"
	"strings"
	"time"

	. "github.com/gostones/filebot/pkg/types"
	"golang.org/x/net/websocket"
)

func hostUser() string {
	name := "user"
	if user, err := user.Current(); err == nil {
		name = user.Username
	}
	host, err := os.Hostname()
	if err != nil {
		host = "host"
	}

	uid := fmt.Sprintf("%s@%s", name, host)
	return uid
}

func baseDir() string {
	var dir string
	if user, err := user.Current(); err == nil {
		dir = user.HomeDir
	}
	if pwd, err := os.Getwd(); err == nil {
		dir = pwd
	}
	p, _ := filepath.Abs(dir)
	return p
}

func listDir(base, parent string) ([]*Node, error) {
	var folders []*Node
	entries, err := ioutil.ReadDir(filepath.Join(base, parent))
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		// ignore unix hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		p := filepath.ToSlash(filepath.Join(base, parent, entry.Name()))
		if entry.IsDir() {
			p += "/"
		}
		rel, _ := filepath.Rel(base, p)
		n := &Node{
			ID:       rel,
			Name:     entry.Name(),
			Folder:   entry.IsDir(),
			Dynamic:  entry.IsDir(),
			Modified: entry.ModTime(),
		}
		folders = append(folders, n)
	}

	return folders, nil

}

func statFile(base, file string) (*Node, error) {
	stat, err := os.Stat(filepath.Join(base, file))
	if err != nil {
		return nil, err
	}
	n := &Node{
		Name:     stat.Name(),
		Folder:   stat.IsDir(),
		Size:     stat.Size(),
		Modified: stat.ModTime(),
	}

	return n, nil
}

func toJSON(obj interface{}) (string, error) {
	b, err := json.Marshal(obj)
	if err != nil {
		return NULL, err
	}
	return string(b), nil
}

type MessageAgent struct {
	uid  string
	base string
	ch   chan string
}

func reply(tid string, n interface{}) string {
	m := make(map[string]interface{})
	m["tid"] = tid
	m["data"] = n
	s, _ := toJSON(m)
	return s
}

func (r MessageAgent) announce(msg string) {
	n := Node{
		ID:      r.uid,
		Name:    r.uid,
		Dynamic: true,
		Note:    msg,
	}

	s := reply("root", n)
	r.ch <- fmt.Sprintf("%s\n", s)
}

// upload simulates file uploading
func (r MessageAgent) upload(tid, args string) {
	var total, loaded int64
	go func() {
		total = 1000
		loaded = 0
		for {
			loaded += rand.Int63n(total)
			if loaded > total {
				loaded = total
			}
			s := reply(tid, Progress{
				ID: args,
				Total:  total,
				Loaded: loaded,
			})
			r.ch <- fmt.Sprintf("%s\n", s)
			if loaded == total {
				return
			}
			time.Sleep(1 * time.Second)
		}
	}()
}

func (r MessageAgent) onMessage(m *Message) {

	fmt.Printf("message received: %v \n", m)

	// format: /command recipient args
	sa := strings.Fields(m.Body)
	if len(sa) == 0 {
		return
	}
	var cmd, recipient, args, tid string
	switch len(sa) {
	case 0:
		return
	case 1:
		cmd = sa[0]
	case 2:
		cmd = sa[0]
		recipient = sa[1]
	case 3:
		cmd = sa[0]
		recipient = sa[1]
		args = sa[2]
	case 4:
		cmd = sa[0]
		recipient = sa[1]
		args = sa[2]
		tid = sa[3]
	}

	// ignore if not a command
	if !strings.HasPrefix(cmd, "/") {
		return
	}

	if args == r.uid {
		args = "/"
	}
	var s string

	switch {
	case cmd == "/who":
		r.announce("hi there!")
		return
	case cmd == "/upload":
		r.upload(tid, args)
		return
	case cmd == "/list" && recipient == r.uid:
		if n, err := listDir(r.base, args); err == nil {
			s = reply(tid, n)
		} else {
			s = fmt.Sprintf("%v", err)
		}
	case cmd == "/stat" && recipient == r.uid:
		if n, err := statFile(r.base, args); err == nil {
			s = reply(tid, n)
		} else {
			s = fmt.Sprintf("%v", err)
		}
	default:
		s = fmt.Sprintf("command not supported: %v", sa[0])
	}

	r.ch <- fmt.Sprintf("%s\n", s)
}

func main() {
	uid := flag.String("name", hostUser(), "user name")
	url := flag.String("url", "ws://localhost:18080/ws", "address of chat server")
	base := flag.String("base", baseDir(), "base folder")
	origin := flag.String("origin", "http://localhost:18080/", "origin of the client")

	flag.Parse()

	ws, err := websocket.Dial(*url, "", *origin)
	defer ws.Close()
	if err != nil {
		log.Fatal("websocket dial error ", err)
	}

	//
	ch := make(chan string)

	agent := MessageAgent{
		base: *base,
		uid:  *uid,
		ch:   ch,
	}

	go func() {
		agent.announce("hello everybody!")

		scanner := bufio.NewScanner(ws)
		for scanner.Scan() {
			s := scanner.Text()
			fmt.Println(s)
			m := Message{}
			err := json.Unmarshal([]byte(s), &m)
			if err == nil {
				agent.onMessage(&m)
			}
		}

		log.Println("Connection closed or error", scanner.Err())
		os.Exit(0)
	}()

	fmt.Println("Start responding to messages ...")
	for s := range ch {
		// websocket.JSON.Send(ws, &info)
		_, err = fmt.Fprintf(ws, s)
	}
}
