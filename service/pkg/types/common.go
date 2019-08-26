package types

import (
	"encoding/json"
	"fmt"
	"time"
)

// NULL represents a string of zero length.
const NULL string = ""

// Message represents the message.
type Message struct {
	Type int    `json:"type"`
	Body string `json:"body"`
}

// Node represents directory/file info.
type Node struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Folder   bool      `json:"folder"`
	Size     int64     `json:"size"`
	Modified time.Time `json:"modified"`
	//
	Children []*Node `json:"children,omitempty"`
	Owner    string  `json:"owner"`
	Dynamic  bool    `json:"loadOnDemand"`
	Note     string  `json:"note"`
}

func (r *Node) Add(nodes ...*Node) {
	for _, n := range nodes {
		fmt.Printf("adding: %v\n", n)
		r.Children = append(r.Children, n)
	}
}

func (r *Node) ToJSON() string {
	b, _ := json.Marshal(r)
	return string(b)
}

type Progress struct {
	ID     string `json:"id"`
	Loaded int64  `json:"loaded"`
	Total  int64  `json:"total"`
	Error  bool   `json:"error"`
	Note   string `json:"note"`
}
