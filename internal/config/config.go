package config

import (
	"flag"
	"fmt"
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

// DockerEngineConfig saves the connection configuration for a single Docker daemon.
type DockerEngineConfig struct {
	Name             string `yaml:"name"`
	Host             string `yaml:"host"` // empty string = auto local probing
	TLSVerify        bool   `yaml:"tls_verify"`
	CertPath         string `yaml:"cert_path"`          // File path for TLS
	CACertBase64     string `yaml:"ca_cert_base64"`     // Base64 memory for TLS
	ClientCertBase64 string `yaml:"client_cert_base64"` // Base64 memory for TLS
	ClientKeyBase64  string `yaml:"client_key_base64"`  // Base64 memory for TLS
}

// CorsConfig saves CORS configuration.
type CorsConfig struct {
	AllowOrigin  string `yaml:"allow_origin"`
	AllowMethods string `yaml:"allow_methods"`
	AllowHeaders string `yaml:"allow_headers"`
}

// Config represents the application configuration.
type Config struct {
	Port          int                  `yaml:"port"`
	DBPath        string               `yaml:"db_path"`
	LogLevel      string               `yaml:"log_level"`
	DockerEngines []DockerEngineConfig `yaml:"docker_engines"`
	CORS          CorsConfig           `yaml:"cors"`
}

// Load reads the configuration prioritizing: CLI flag > ENV var > YAML > Default
func Load() (*Config, error) {
	// 1. Set Defaults
	cfg := &Config{
		Port:     12581,
		DBPath:   "./crafter.db",
		LogLevel: "INFO",
	}

	// 2. Define Command Line Flags
	// We use FlagSet to avoid panic if Load is called multiple times (e.g. in tests)
	fs := flag.NewFlagSet("docker-crafter", flag.ContinueOnError)

	var configPath string
	var cliPort int
	var cliDBPath string

	fs.StringVar(&configPath, "config", "", "Path to the yaml config file (default: ./config.yml)")
	fs.IntVar(&cliPort, "port", 0, "Server port (overrides yaml and env)")
	fs.StringVar(&cliDBPath, "db-path", "", "Path to the SQLite database file (overrides yaml and env)")

	// Parse flags using os.Args[1:]
	if err := fs.Parse(os.Args[1:]); err != nil {
		return nil, fmt.Errorf("error parsing flags: %w", err)
	}

	// Determine config path
	path := "./config.yml"
	if configPath != "" {
		path = configPath
	}

	// 3. Load from YAML (if it exists)
	yamlData, err := os.ReadFile(path)
	if err == nil {
		// File exists, parse it
		if err := yaml.Unmarshal(yamlData, cfg); err != nil {
			return nil, fmt.Errorf("error parsing yaml config %s: %w", path, err)
		}
	} else if !os.IsNotExist(err) {
		// Only error out if the problem is not "file doesn't exist"
		return nil, fmt.Errorf("error reading config file %s: %w", path, err)
	} else if configPath != "" {
		// If user EXPLICITLY provided a path via -config and it doesn't exist, we should probably error out
		return nil, fmt.Errorf("specified config file %s not found", path)
	}

	// 4. Load from Environment Variables (Overrides YAML)
	envPort := os.Getenv("CRAFTER_PORT")
	if envPort != "" {
		p, err := strconv.Atoi(envPort)
		if err == nil {
			cfg.Port = p
		} else {
			return nil, fmt.Errorf("invalid CRAFTER_PORT environment variable: %w", err)
		}
	}

	envDBPath := os.Getenv("CRAFTER_DB_PATH")
	if envDBPath != "" {
		cfg.DBPath = envDBPath
	}

	// 5. Override from Command Line Flags (Highest Priority)
	if cliPort != 0 {
		cfg.Port = cliPort
	}
	if cliDBPath != "" {
		cfg.DBPath = cliDBPath
	}

	// 6. Ensure at least one Docker engine exists
	if len(cfg.DockerEngines) == 0 {
		cfg.DockerEngines = []DockerEngineConfig{
			{
				Name: "local",
				Host: "",
			},
		}
	}

	return cfg, nil
}
