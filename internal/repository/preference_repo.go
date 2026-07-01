package repository

import (
	"context"
	"errors"

	"docker-crafter/internal/db"
	"gorm.io/gorm"
)

// PreferenceRepository handles database operations for UserPreferences
type PreferenceRepository struct {
	db *gorm.DB
}

// NewPreferenceRepository creates a new PreferenceRepository
func NewPreferenceRepository(db *gorm.DB) *PreferenceRepository {
	return &PreferenceRepository{db: db}
}

// GetByKey retrieves a user preference by key
func (r *PreferenceRepository) GetByKey(ctx context.Context, key string) (*db.UserPreference, error) {
	var pref db.UserPreference
	result := r.db.WithContext(ctx).Where("key = ?", key).First(&pref)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil // Not found, return nil
		}
		return nil, result.Error
	}
	return &pref, nil
}

// Set creates or updates a user preference
func (r *PreferenceRepository) Set(ctx context.Context, key string, value string) error {
	var existing db.UserPreference
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	pref := db.UserPreference{
		Key:   key,
		Value: value,
	}

	if existing.ID != 0 {
		pref.ID = existing.ID
	}

	return r.db.WithContext(ctx).Save(&pref).Error
}
