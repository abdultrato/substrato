(function () {
  function isNumericType(value) {
    return String(value) === "NUMERICO";
  }

  function resolveFields(prefix) {
    var ids = [
      prefix + "valor_minimo",
      prefix + "valor_maximo",
      prefix + "critico_baixo",
      prefix + "critico_alto",
    ];

    return ids
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
  }

  function setDisabled(fields, disabled) {
    fields.forEach(function (field) {
      field.disabled = disabled;
    });
  }

  function updateByTipo(tipoField) {
    var prefix = tipoField.id.replace(/tipo$/, "");
    var fields = resolveFields(prefix);
    var enableNumeric = isNumericType(tipoField.value);
    setDisabled(fields, !enableNumeric);
  }

  function bind(tipoField) {
    tipoField.addEventListener("change", function () {
      updateByTipo(tipoField);
    });
    updateByTipo(tipoField);
  }

  function init() {
    var tipoFields = document.querySelectorAll(
      "select[id$='tipo'], input[id$='tipo']"
    );
    tipoFields.forEach(bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
