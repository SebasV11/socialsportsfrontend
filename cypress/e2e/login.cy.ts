describe('Login', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('gebruiker logt in met geldig account', () => {
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

    cy.visit('/login');
    cy.get('#email').type('admin@sportmatch.local');
    cy.get('#password').type('Admin1234!');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });

  it('foutmelding bij leeg wachtwoord', () => {
    cy.intercept('POST', '**/api/login').as('loginAttempt');

    cy.visit('/login');
    cy.get('#email').type('demo@sportmatch.local');
    cy.get('button[type="submit"]').click();

    cy.contains(/Vul zowel je e-mailadres als wachtwoord in\./).should('be.visible');
    cy.get('@loginAttempt.all').should('have.length', 0);
  });
});
