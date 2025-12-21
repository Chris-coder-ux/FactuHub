/**
 * Artillery processor for banking performance tests
 * Handles dynamic data generation and response validation
 */

module.exports = {
  generateTransactionData,
  validateTransactionResponse,
  generateDateRange,
};

function generateTransactionData(context, events, done) {
  // Generate random transaction data for testing
  const amounts = [100, 250, 500, 1000, 2500, 5000];
  const descriptions = [
    'Payment for services',
    'Invoice payment',
    'Monthly subscription',
    'Product purchase',
    'Service fee',
  ];
  
  context.vars.testAmount = amounts[Math.floor(Math.random() * amounts.length)];
  context.vars.testDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  return done();
}

function validateTransactionResponse(requestParams, response, context, events, done) {
  // Validate response structure
  if (response.statusCode === 200) {
    try {
      const body = JSON.parse(response.body);
      if (!body.data || !Array.isArray(body.data)) {
        events.emit('counter', 'invalid_response_structure', 1);
      }
      if (!body.pagination) {
        events.emit('counter', 'missing_pagination', 1);
      }
    } catch (e) {
      events.emit('counter', 'invalid_json', 1);
    }
  }
  
  return done();
}

function generateDateRange(context, events, done) {
  // Generate date range for last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  context.vars.startDate = startDate.toISOString().split('T')[0];
  context.vars.endDate = endDate.toISOString().split('T')[0];
  
  return done();
}

