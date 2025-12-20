// Processor para Artillery - configuración de baja memoria
module.exports = {
  beforeRequest: function(requestParams, context, ee, next) {
    // Usar IDs fijos para minimizar consultas a DB y memoria
    context.vars.invoiceId = '507f1f77bcf86cd799439011'; // ID de ejemplo
    context.vars.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake'; // Token mock

    // Configurar headers para minimizar procesamiento
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['User-Agent'] = 'Artillery-Test/1.0';

    return next();
  },

  afterResponse: function(requestParams, response, context, ee, next) {
    // Limpiar variables después de cada request para liberar memoria
    if (context.vars) {
      delete context.vars.tempData;
    }

    // Pequeña pausa para evitar sobrecarga
    setTimeout(() => next(), 100);
    return next();
  }
};