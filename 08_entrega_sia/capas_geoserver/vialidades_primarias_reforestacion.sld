<?xml version="1.0" encoding="UTF-8"?>
<!-- Colores de la herramienta (variables p0 a p4). Más gruesas que los frentes: se miden sobre el eje. -->
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer><Name>sia:vialidades_primarias_reforestacion</Name><UserStyle><Name>vialidades_primarias_reforestacion</Name><Title>Vialidades primarias por prioridad de reforestación</Title><FeatureTypeStyle>
    <Rule><Name>Muy Baja_</Name><Title>Muy Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MinScaleDenominator>20000</MinScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#F9E7BF</CssParameter><CssParameter name="stroke-width">5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Muy Baja_20000</Name><Title>Muy Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MaxScaleDenominator>20000</MaxScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#F9E7BF</CssParameter><CssParameter name="stroke-width">2.5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Baja_</Name><Title>Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MinScaleDenominator>20000</MinScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#F4C56E</CssParameter><CssParameter name="stroke-width">5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Baja_20000</Name><Title>Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MaxScaleDenominator>20000</MaxScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#F4C56E</CssParameter><CssParameter name="stroke-width">2.5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Media_</Name><Title>Media</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>2</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MinScaleDenominator>20000</MinScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#E88A2E</CssParameter><CssParameter name="stroke-width">5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Media_20000</Name><Title>Media</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>2</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MaxScaleDenominator>20000</MaxScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#E88A2E</CssParameter><CssParameter name="stroke-width">2.5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Alta_</Name><Title>Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>3</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MinScaleDenominator>20000</MinScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#C2421B</CssParameter><CssParameter name="stroke-width">5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Alta_20000</Name><Title>Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>3</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MaxScaleDenominator>20000</MaxScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#C2421B</CssParameter><CssParameter name="stroke-width">2.5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Muy Alta_</Name><Title>Muy Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>4</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MinScaleDenominator>20000</MinScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#7F1D12</CssParameter><CssParameter name="stroke-width">5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
    <Rule><Name>Muy Alta_20000</Name><Title>Muy Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>4</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><MaxScaleDenominator>20000</MaxScaleDenominator>
      <LineSymbolizer><Stroke><CssParameter name="stroke">#7F1D12</CssParameter><CssParameter name="stroke-width">2.5</CssParameter><CssParameter name="stroke-linecap">round</CssParameter></Stroke></LineSymbolizer></Rule>
  </FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>
