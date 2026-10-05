<?xml version="1.0" encoding="UTF-8"?>
<!-- Relleno con los colores de la herramienta (variables p0 a p4), semitransparente, y contorno gris. Colonias sin prioridad: gris. -->
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer><Name>sia:colonias_reforestacion</Name><UserStyle><Name>colonias_reforestacion</Name><Title>Colonias por prioridad de reforestación</Title><FeatureTypeStyle>
    <Rule><Name>Muy Baja</Name><Title>Muy Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#F9E7BF</CssParameter><CssParameter name="fill-opacity">0.6</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
    <Rule><Name>Baja</Name><Title>Baja</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#F4C56E</CssParameter><CssParameter name="fill-opacity">0.6</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
    <Rule><Name>Media</Name><Title>Media</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>2</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#E88A2E</CssParameter><CssParameter name="fill-opacity">0.6</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
    <Rule><Name>Alta</Name><Title>Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>3</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#C2421B</CssParameter><CssParameter name="fill-opacity">0.6</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
    <Rule><Name>Muy Alta</Name><Title>Muy Alta</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>clase_prioridad</ogc:PropertyName><ogc:Literal>4</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#7F1D12</CssParameter><CssParameter name="fill-opacity">0.6</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
    <Rule><Name>Sin dato</Name><Title>Sin prioridad</Title><ogc:Filter><ogc:PropertyIsNull><ogc:PropertyName>clase_prioridad</ogc:PropertyName></ogc:PropertyIsNull></ogc:Filter>
      <PolygonSymbolizer><Fill><CssParameter name="fill">#BDBDBD</CssParameter><CssParameter name="fill-opacity">0.4</CssParameter></Fill><Stroke><CssParameter name="stroke">#6B6B6B</CssParameter><CssParameter name="stroke-width">0.6</CssParameter><CssParameter name="stroke-opacity">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule>
  </FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>
