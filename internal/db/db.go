package db

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewDB initializes the SQLite database connection, applies performance pragmas, and runs automigration
func NewDB(dbPath string) (*gorm.DB, error) {
	// Apply WAL mode and NORMAL synchronous for performance via DSN string
	dsn := fmt.Sprintf("%s?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)", dbPath)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate the database schema
	err = db.AutoMigrate(
		&ContainerMetadataOverride{},
		&UserPreference{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return db, nil
}
