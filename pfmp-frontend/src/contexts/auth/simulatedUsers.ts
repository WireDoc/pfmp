import type { SimulatedUser } from './types';

// Central place for dev-mode simulated accounts. Keep intentionally small.
export const SIMULATED_USERS: SimulatedUser[] = [
    {
        username: 'john.smith@example.com',
        name: 'John Smith',
        email: 'john.smith@example.com',
        homeAccountId: 'dev-john-001',
        localAccountId: 'dev-john-001',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    },
    {
        username: 'sarah.johnson@example.com',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        homeAccountId: 'dev-sarah-002',
        localAccountId: 'dev-sarah-002',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    },
    {
        username: 'mike.davis@example.com',
        name: 'Mike Davis',
        email: 'mike.davis@example.com',
        homeAccountId: 'dev-mike-003',
        localAccountId: 'dev-mike-003',
        environment: 'login.microsoftonline.com',
        tenantId: '90c3ba91-a0c4-4816-9f8f-beeefbfc33d2'
    }
];
