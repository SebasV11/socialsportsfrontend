describe('Admin', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('admin ziet dashboard', () => {
    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: {
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@sportmatch.local',
          role: 'admin',
          is_admin: true,
        },
      },
    }).as('getUser');

    cy.intercept('POST', '**/api/login', {
      statusCode: 200,
      body: {
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@sportmatch.local',
          role: 'admin',
          is_admin: true,
        },
        token: 'fake-token',
      },
    }).as('loginRequest');

    cy.intercept('GET', '**/api/admin/overview', {
      statusCode: 200,
      body: {
        summary: {
          users_total: 1,
          admins_total: 1,
          active_users: 1,
          matches_total: 0,
          pending_matches: 0,
          messages_total: 0,
        },
        users: [
          {
            id: 1,
            name: 'Admin User',
            email: 'admin@sportmatch.local',
            city: 'Amsterdam',
            is_active: true,
            is_admin: true,
            created_at: new Date().toISOString(),
          },
        ],
        matches: [],
      },
    }).as('adminOverview');

    cy.visit('/login');
    cy.get('#email').type('admin@sportmatch.local');
    cy.get('#password').type('Admin1234!');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');

    cy.visit('/admin');
    cy.wait('@getUser');
    cy.wait('@adminOverview');
    cy.contains('Gebruikers beheren').should('be.visible');
  });

  it('normale gebruiker wordt geredirect van /admin', () => {
    cy.intercept('GET', '**/api/user', {
      statusCode: 200,
      body: {
        user: {
          id: 2,
          name: 'Demo User',
          email: 'demo@sportmatch.local',
          role: 'user',
          is_admin: false,
        },
      },
    }).as('getUser');

    cy.intercept('POST', '**/api/login', {
      statusCode: 200,
      body: {
        user: {
          id: 2,
          name: 'Demo User',
          email: 'demo@sportmatch.local',
          role: 'user',
          is_admin: false,
        },
        token: 'fake-user-token',
      },
    }).as('loginRequest');

    cy.visit('/login');
    cy.get('#email').type('demo@sportmatch.local');
    cy.get('#password').type('Demo1234!');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');

    cy.visit('/admin');
    cy.wait('@getUser');
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
  });
});
