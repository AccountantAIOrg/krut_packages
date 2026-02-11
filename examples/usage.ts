// Example 1: Basic usage with API key validation
import { KrutAuth } from '@krutai/auth';

async function example1() {
    // Initialize with API key
    const auth = new KrutAuth({
        apiKey: 'your-krutai-api-key-here',
        betterAuthOptions: {
            // Better Auth configuration
            // See: https://www.better-auth.com/docs
        },
    });

    // Initialize and validate API key
    await auth.initialize();

    // Get Better Auth instance for full access
    const betterAuth = auth.getBetterAuth();
    console.log('Auth initialized successfully!');
}

// Example 2: Skip async validation on init
import { KrutAuth as KrutAuth2 } from '@krutai/auth';

function example2() {
    // Skip API key validation on initialization
    const auth = new KrutAuth2({
        apiKey: 'your-krutai-api-key-here',
        validateOnInit: false,
        betterAuthOptions: {
            // Better Auth configuration
        },
    });

    // No need to call initialize()
    const betterAuth = auth.getBetterAuth();
    console.log('Auth ready without async validation!');
}

// Example 3: Error handling
import { KrutAuth as KrutAuth3, ApiKeyValidationError } from '@krutai/auth';

async function example3() {
    try {
        const auth = new KrutAuth3({
            apiKey: 'invalid-key',
        });
        await auth.initialize();
    } catch (error) {
        if (error instanceof ApiKeyValidationError) {
            console.error('API key validation failed:', error.message);
        }
    }
}

// Example 4: Using the main krutai package
import { VERSION, metadata } from 'krutai';

function example4() {
    console.log(`KrutAI v${VERSION}`);
    console.log('Package metadata:', metadata);
}

// Run examples
example1().catch(console.error);
example2();
example3().catch(console.error);
example4();
