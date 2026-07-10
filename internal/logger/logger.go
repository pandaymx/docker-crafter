package logger

import (
	"log"
	"strings"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var currentLevel Level = INFO

func SetLevel(levelStr string) {
	switch strings.ToUpper(strings.TrimSpace(levelStr)) {
	case "DEBUG":
		currentLevel = DEBUG
	case "INFO":
		currentLevel = INFO
	case "WARN", "WARNING":
		currentLevel = WARN
	case "ERROR":
		currentLevel = ERROR
	default:
		currentLevel = INFO
	}
}

func GetLevelString() string {
	switch currentLevel {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	default:
		return "INFO"
	}
}

func Debugf(format string, v ...interface{}) {
	if currentLevel <= DEBUG {
		log.Printf("[DEBUG] "+format, v...)
	}
}
func Infof(format string, v ...interface{}) {
	if currentLevel <= INFO {
		log.Printf("[INFO] "+format, v...)
	}
}
func Warnf(format string, v ...interface{}) {
	if currentLevel <= WARN {
		log.Printf("[WARN] "+format, v...)
	}
}
func Errorf(format string, v ...interface{}) {
	if currentLevel <= ERROR {
		log.Printf("[ERROR] "+format, v...)
	}
}
func Fatalf(format string, v ...interface{}) {
	log.Fatalf("[FATAL] "+format, v...)
}
