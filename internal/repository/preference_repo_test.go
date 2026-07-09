package repository

import (
	"context"
	"fmt"
	"testing"

	"docker-crafter/internal/db"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	// Use a uniquely named in-memory SQLite database for each test to ensure isolation,
	// with shared cache to support GORM's connection pool.
	dbName := uuid.New().String()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", dbName)
	gormDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "failed to connect to in-memory sqlite database")

	err = gormDB.AutoMigrate(&db.UserPreference{})
	require.NoError(t, err, "failed to migrate database")

	return gormDB
}

func TestPreferenceRepository_GetByKey_NotFound(t *testing.T) {
	gormDB := setupTestDB(t)
	repo := NewPreferenceRepository(gormDB)

	ctx := context.Background()
	pref, err := repo.GetByKey(ctx, "nonexistent_key")

	// The implementation intentionally swallows gorm.ErrRecordNotFound
	// and returns (nil, nil) instead of an error. We verify this behavior.
	require.NoError(t, err)
	assert.Nil(t, pref)
}

func TestPreferenceRepository_SetAndGet(t *testing.T) {
	gormDB := setupTestDB(t)
	repo := NewPreferenceRepository(gormDB)

	ctx := context.Background()

	// Test Set
	err := repo.Set(ctx, "theme", "dark")
	require.NoError(t, err)

	// Test GetByKey
	pref, err := repo.GetByKey(ctx, "theme")
	require.NoError(t, err)
	require.NotNil(t, pref)
	assert.Equal(t, "theme", pref.Key)
	assert.Equal(t, "dark", pref.Value)

	// Test Update via Set
	err = repo.Set(ctx, "theme", "light")
	require.NoError(t, err)

	// Verify Update
	prefUpdated, err := repo.GetByKey(ctx, "theme")
	require.NoError(t, err)
	require.NotNil(t, prefUpdated)
	assert.Equal(t, "theme", prefUpdated.Key)
	assert.Equal(t, "light", prefUpdated.Value)

	// Ensure ID is same, meaning it updated the existing record
	assert.Equal(t, pref.ID, prefUpdated.ID)
}

func TestPreferenceRepository_SetEmptyKey(t *testing.T) {
	gormDB := setupTestDB(t)
	repo := NewPreferenceRepository(gormDB)

	ctx := context.Background()

	// Test Set with empty key
	err := repo.Set(ctx, "", "value")
	require.NoError(t, err)

	pref, err := repo.GetByKey(ctx, "")
	require.NoError(t, err)
	require.NotNil(t, pref)
	assert.Equal(t, "", pref.Key)
	assert.Equal(t, "value", pref.Value)
}
