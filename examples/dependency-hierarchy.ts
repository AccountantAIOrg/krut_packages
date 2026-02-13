/**
 * Example demonstrating the parent-child dependency relationship
 * between krutai (parent) and @krutai/auth (child)
 * 
 * When you install @krutai/auth, krutai is automatically installed as a dependency.
 * All API validation is centralized in the krutai package.
 */

// Example 1: Using @krutai/auth (which automatically includes krutai)
import { KrutAuth, validateApiKeyFormat, ApiKeyValidationError } from '@krutai/auth';

async function demonstrateAuthWithValidation() {
    console.log('=== Example 1: @krutai/auth with centralized validation ===\n');

    try {
        // The validation functions come from the parent krutai package
        // but are re-exported by @krutai/auth for convenience
        validateApiKeyFormat('my-api-key-123456');
        console.log('✓ API key format is valid');

        // Initialize auth client
        const auth = new KrutAuth({
            apiKey: 'my-api-key-123456',
            betterAuthOptions: {
                // Better Auth configuration
            },
        });

        await auth.initialize();
        console.log('✓ Auth client initialized successfully\n');

    } catch (error) {
        if (error instanceof ApiKeyValidationError) {
            console.error('✗ API validation failed:', error.message);
        }
    }
}

// Example 2: Using krutai directly for API validation
import {
    validateApiKeyFormat as validateFormat,
    validateApiKeyWithService,
    createApiKeyChecker,
    ApiKeyValidationError as ValidationError,
    VERSION,
    metadata
} from 'krutai';

async function demonstrateKrutaiCore() {
    console.log('=== Example 2: Using krutai core directly ===\n');

    console.log(`KrutAI Version: ${VERSION}`);
    console.log('Package metadata:', metadata);
    console.log('');

    // Format validation
    try {
        validateFormat('short'); // This will fail
    } catch (error) {
        if (error instanceof ValidationError) {
            console.log('✗ Expected error:', error.message);
        }
    }

    // Valid API key
    const apiKey = 'valid-api-key-123456';
    validateFormat(apiKey);
    console.log('✓ API key format is valid');

    // Service validation
    const isValid = await validateApiKeyWithService(apiKey);
    console.log(`✓ API key service validation: ${isValid}\n`);

    // Using API key checker with caching
    const checker = createApiKeyChecker(apiKey);
    await checker.validate(); // First call validates
    await checker.validate(); // Second call uses cache
    console.log('✓ API key checker with caching works\n');
}

// Example 3: Demonstrating the dependency hierarchy
async function demonstrateDependencyHierarchy() {
    console.log('=== Example 3: Dependency Hierarchy ===\n');

    console.log('Package Structure:');
    console.log('  krutai (parent)');
    console.log('    ├── Provides: API validation');
    console.log('    ├── Exports: validateApiKeyFormat, validateApiKeyWithService, etc.');
    console.log('    └── No dependencies on @krutai/* packages');
    console.log('');
    console.log('  @krutai/auth (child)');
    console.log('    ├── Depends on: krutai');
    console.log('    ├── Uses: krutai\'s API validation');
    console.log('    ├── Provides: Better Auth integration');
    console.log('    └── Re-exports: krutai validation utilities for convenience');
    console.log('');
    console.log('Installation:');
    console.log('  npm install @krutai/auth');
    console.log('  → Automatically installs krutai as well');
    console.log('');
    console.log('Benefits:');
    console.log('  ✓ Centralized API validation in krutai');
    console.log('  ✓ All @krutai/* packages use the same validation logic');
    console.log('  ✓ No code duplication');
    console.log('  ✓ Consistent API key handling across all packages\n');
}

// Run all examples
async function runAllExamples() {
    await demonstrateAuthWithValidation();
    await demonstrateKrutaiCore();
    await demonstrateDependencyHierarchy();
}

// Execute
runAllExamples().catch(console.error);
