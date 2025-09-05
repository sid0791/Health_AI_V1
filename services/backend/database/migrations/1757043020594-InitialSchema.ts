import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1757043020594 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM types first
        await queryRunner.query(`
            CREATE TYPE "user_role_enum" AS ENUM('user', 'admin', 'moderator');
            CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive', 'suspended', 'deleted');
            CREATE TYPE "oauth_provider_enum" AS ENUM('google', 'apple', 'facebook');
            CREATE TYPE "health_report_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed');
            CREATE TYPE "meal_plan_status_enum" AS ENUM('draft', 'active', 'completed', 'cancelled');
        `);

        // Users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" varchar(255) UNIQUE,
                "phone_number" varchar(20),
                "phone" varchar(20),
                "name" varchar(255),
                "password_hash" varchar(255),
                "profile_completed" boolean DEFAULT false,
                "profile_picture_url" varchar(500),
                "role" "user_role_enum" DEFAULT 'user',
                "status" "user_status_enum" DEFAULT 'active',
                "email_verified" boolean DEFAULT false,
                "phone_verified" boolean DEFAULT false,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes for users
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_users_email" ON "users"("email") WHERE email IS NOT NULL;
            CREATE UNIQUE INDEX "IDX_users_phone_number" ON "users"("phone_number") WHERE phone_number IS NOT NULL;
            CREATE UNIQUE INDEX "IDX_users_phone" ON "users"("phone") WHERE phone IS NOT NULL;
        `);

        // User OAuth accounts
        await queryRunner.query(`
            CREATE TABLE "user_oauth_accounts" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "provider" "oauth_provider_enum" NOT NULL,
                "provider_id" varchar(255) NOT NULL,
                "provider_email" varchar(255),
                "provider_name" varchar(255),
                "provider_picture" varchar(500),
                "access_token" text,
                "refresh_token" text,
                "token_expires_at" timestamp,
                "scope" varchar(500),
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // Create indexes for OAuth accounts
        await queryRunner.query(`
            CREATE INDEX "IDX_oauth_user_provider" ON "user_oauth_accounts"("user_id", "provider");
            CREATE UNIQUE INDEX "IDX_oauth_provider_id" ON "user_oauth_accounts"("provider", "provider_id");
        `);

        // User profiles
        await queryRunner.query(`
            CREATE TABLE "user_profiles" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL UNIQUE,
                "first_name" varchar(100),
                "last_name" varchar(100),
                "display_name" varchar(200),
                "date_of_birth" date,
                "gender" varchar(20),
                "height_cm" float,
                "weight_kg" float,
                "activity_level" varchar(50),
                "location_city" varchar(100),
                "location_country" varchar(100),
                "timezone" varchar(50),
                "bio" text,
                "emergency_contact_name" varchar(200),
                "emergency_contact_phone" varchar(20),
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // User health profiles
        await queryRunner.query(`
            CREATE TABLE "user_health_profiles" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL UNIQUE,
                "medical_conditions" text[],
                "medications" text[],
                "allergies" text[],
                "dietary_restrictions" text[],
                "fitness_goals" text[],
                "target_weight_kg" float,
                "target_body_fat_percentage" float,
                "target_muscle_mass_kg" float,
                "health_goals" text[],
                "exercise_preferences" text[],
                "sleep_target_hours" float,
                "water_intake_target_ml" integer,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // User preferences
        await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL UNIQUE,
                "cuisine_preferences" text[],
                "dietary_preferences" text[],
                "cooking_time_preference" varchar(50),
                "budget_range" varchar(50),
                "spice_tolerance" varchar(20),
                "meal_complexity" varchar(20),
                "favorite_ingredients" text[],
                "disliked_ingredients" text[],
                "notification_preferences" jsonb,
                "language" varchar(10) DEFAULT 'en',
                "theme" varchar(20) DEFAULT 'light',
                "units" varchar(10) DEFAULT 'metric',
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // Health reports
        await queryRunner.query(`
            CREATE TABLE "health_reports" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "original_filename" varchar(500),
                "file_size" integer,
                "file_type" varchar(50),
                "upload_path" varchar(1000),
                "status" "health_report_status_enum" DEFAULT 'pending',
                "ocr_text" text,
                "structured_data" jsonb,
                "ai_analysis" jsonb,
                "red_flags" text[],
                "recommendations" text[],
                "test_date" date,
                "doctor_name" varchar(200),
                "clinic_name" varchar(200),
                "report_type" varchar(100),
                "key_metrics" jsonb,
                "processing_started_at" timestamp,
                "processing_completed_at" timestamp,
                "error_message" text,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // Meal plans
        await queryRunner.query(`
            CREATE TABLE "meal_plans" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "name" varchar(200),
                "description" text,
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "status" "meal_plan_status_enum" DEFAULT 'draft',
                "total_calories_target" float,
                "protein_target_g" float,
                "carbs_target_g" float,
                "fat_target_g" float,
                "fiber_target_g" float,
                "budget_target" float,
                "cuisine_focus" varchar(100),
                "complexity_level" varchar(20),
                "ai_generation_params" jsonb,
                "nutritional_summary" jsonb,
                "shopping_list" jsonb,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // Meal plan entries
        await queryRunner.query(`
            CREATE TABLE "meal_plan_entries" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "meal_plan_id" uuid NOT NULL,
                "date" date NOT NULL,
                "meal_type" varchar(50) NOT NULL,
                "recipe_id" uuid,
                "recipe_name" varchar(200),
                "recipe_data" jsonb,
                "calories" float,
                "protein_g" float,
                "carbs_g" float,
                "fat_g" float,
                "fiber_g" float,
                "preparation_time_minutes" integer,
                "cooking_time_minutes" integer,
                "difficulty_level" varchar(20),
                "estimated_cost" float,
                "ingredients" jsonb,
                "instructions" jsonb,
                "nutrition_per_serving" jsonb,
                "servings" integer DEFAULT 1,
                "notes" text,
                "completed_at" timestamp,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE
            );
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_health_reports_user_status" ON "health_reports"("user_id", "status");
            CREATE INDEX "IDX_health_reports_created_at" ON "health_reports"("created_at");
            CREATE INDEX "IDX_meal_plans_user_dates" ON "meal_plans"("user_id", "start_date", "end_date");
            CREATE INDEX "IDX_meal_plan_entries_plan_date" ON "meal_plan_entries"("meal_plan_id", "date");
        `);

        // Chat sessions for AI chat functionality
        await queryRunner.query(`
            CREATE TABLE "chat_sessions" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "session_type" varchar(50) NOT NULL,
                "title" varchar(200),
                "context_data" jsonb,
                "is_active" boolean DEFAULT true,
                "message_count" integer DEFAULT 0,
                "last_message_at" timestamp,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        // Chat messages
        await queryRunner.query(`
            CREATE TABLE "chat_messages" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "session_id" uuid NOT NULL,
                "role" varchar(20) NOT NULL,
                "content" text NOT NULL,
                "metadata" jsonb,
                "token_count" integer,
                "model_used" varchar(100),
                "processing_time_ms" integer,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE
            );
        `);

        // Create additional indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_chat_sessions_user_active" ON "chat_sessions"("user_id", "is_active");
            CREATE INDEX "IDX_chat_messages_session_created" ON "chat_messages"("session_id", "created_at");
        `);

        console.log('✅ Initial schema migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order to avoid foreign key conflicts
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_sessions" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "meal_plan_entries" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "meal_plans" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "health_reports" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_health_profiles" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_oauth_accounts" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);

        // Drop ENUM types
        await queryRunner.query(`
            DROP TYPE IF EXISTS "oauth_provider_enum";
            DROP TYPE IF EXISTS "health_report_status_enum";
            DROP TYPE IF EXISTS "meal_plan_status_enum";
            DROP TYPE IF EXISTS "user_status_enum";
            DROP TYPE IF EXISTS "user_role_enum";
        `);

        console.log('✅ Initial schema migration rollback completed');
    }

}
