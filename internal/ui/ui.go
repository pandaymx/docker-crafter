package ui

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// FS returns a filesystem containing the frontend assets.
// It strips the "dist" prefix so that the root of the returned
// filesystem corresponds to the root of the frontend dist directory.
func FS() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}
