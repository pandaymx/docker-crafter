package repository

import (
	"context"
	"errors"

	"docker-crafter/internal/db"
	"gorm.io/gorm"
)

// ContainerRepository handles database operations for ContainerMetadataOverrides
type ContainerRepository struct {
	db *gorm.DB
}

// NewContainerRepository creates a new ContainerRepository
func NewContainerRepository(db *gorm.DB) *ContainerRepository {
	return &ContainerRepository{db: db}
}

// GetByContainerID retrieves the metadata override for a specific container
func (r *ContainerRepository) GetByContainerID(ctx context.Context, containerID string) (*db.ContainerMetadataOverride, error) {
	var override db.ContainerMetadataOverride
	result := r.db.WithContext(ctx).Where("container_id = ?", containerID).First(&override)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil // Not found is not necessarily an error, just return nil
		}
		return nil, result.Error
	}
	return &override, nil
}

// Save creates or updates a metadata override
func (r *ContainerRepository) Save(ctx context.Context, override *db.ContainerMetadataOverride) error {
	// GORM's Save performs an upsert if primary key is present, otherwise insert.
	// We want to upsert based on container_id since it's unique
	var existing db.ContainerMetadataOverride
	err := r.db.WithContext(ctx).Where("container_id = ?", override.ContainerID).First(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if existing.ID != 0 {
		override.ID = existing.ID // Ensure we update the existing record
	}

	return r.db.WithContext(ctx).Save(override).Error
}
