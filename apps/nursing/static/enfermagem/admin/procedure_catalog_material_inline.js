(function ($) {
  "use strict";

  function getInlineRow($input) {
    return $input.closest("tr.form-row");
  }

  function findUnitCostInput($productSelect) {
    var id = $productSelect.attr("id") || "";
    if (!id) return null;
    var unitId = id.replace(/-product$/, "-default_unit_cost");
    if (unitId === id) return null;
    return $("#" + unitId);
  }

  function buildPriceUrl(productId) {
    return (
      window.location.origin +
      "/admin/enfermagem/procedurecatalog/product-price/" +
      productId +
      "/"
    );
  }

  function fetchSalePrice(productId) {
    var url = buildPriceUrl(productId);
    return window
      .fetch(url, { credentials: "same-origin" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        return data && data.sale_price ? data.sale_price : "0.00";
      });
  }

  function setUnitCost($productSelect, salePrice) {
    var $unit = findUnitCostInput($productSelect);
    if (!$unit || !$unit.length) return;
    $unit.val(salePrice);
    $unit.trigger("change");
  }

  function handleProductChange($productSelect) {
    var productId = $productSelect.val();
    if (!productId) {
      setUnitCost($productSelect, "0.00");
      return;
    }

    fetchSalePrice(productId)
      .then(function (salePrice) {
        setUnitCost($productSelect, salePrice);
      })
      .catch(function () {
        // Silencioso: não bloquear o formulário se o endpoint falhar.
      });
  }

  $(function () {
    // Atualiza quando o produto é selecionado via select2 (autocomplete_fields).
    $(document).on("select2:select", 'select[id$="-product"]', function () {
      handleProductChange($(this));
    });

    // Também cobre casos sem select2 (fallback).
    $(document).on("change", 'select[id$="-product"]', function () {
      handleProductChange($(this));
    });

    // Quando uma nova linha inline é adicionada.
    $(document).on("formset:added", function (event, $row) {
      var $product = $row.find('select[id$="-product"]');
      if ($product.length) {
        handleProductChange($product);
      }
    });

    // Se já veio produto preenchido (edição), sincroniza o custo na carga inicial.
    $('select[id$="-product"]').each(function () {
      var $product = $(this);
      var $unit = findUnitCostInput($product);
      if ($unit && $unit.length && !$unit.val()) {
        handleProductChange($product);
      }
    });
  });
})(django.jQuery);

