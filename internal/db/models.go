package db

import (
	"time"
)

// ContainerMetadataOverride represents user-defined metadata for a container
type ContainerMetadataOverride struct {
	ID          uint   `gorm:"primaryKey"`
	ContainerID string `gorm:"uniqueIndex;not null"`
	AliasName   string `gorm:"size:255"`
	Notes       string `gorm:"type:text"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// UserPreference represents key-value store for user preferences
type UserPreference struct {
	ID        uint   `gorm:"primaryKey"`
	Key       string `gorm:"uniqueIndex;not null"`
	Value     string `gorm:"type:text"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
