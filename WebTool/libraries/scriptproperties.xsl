<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!-- Parameters for filtering and sorting -->
  <xsl:param name="expression" />
  <xsl:param name="scripttype" select="'any'" />
  <xsl:param name="sort" />

  <!-- Root template: Main entry point with debugging -->
  <xsl:template match="/*">
    <html>
      <head>
        <title>Script Property Documentation</title>
        <link rel="stylesheet" type="text/css" href="scriptproperties.css"/>
      </head>
      <body>
        <xsl:comment>Starting transformation with expression: <xsl:value-of select="$expression"/></xsl:comment>
        <xsl:choose>

          <!-- No expression: Show all keywords and datatypes -->
          <xsl:when test="not($expression)">
            <h1>Base Keywords:</h1>
            <xsl:apply-templates select="keyword[
              not(@script) or @script='any' or $scripttype='any' or @script=$scripttype
            ]" mode="list" />
            <h1>Data Types:</h1>
            <xsl:apply-templates select="datatype" mode="list" />
          </xsl:when>

          <!-- Datatype prefix (e.g., $pla) without dot -->
          <xsl:when test="not(contains($expression, '.')) and starts-with($expression, '$')">
            <xsl:variable name="datatypePrefix" select="substring($expression, 2)" />
            <xsl:variable name="datatypes" select="datatype[
              starts-with(@name, $datatypePrefix) and not(@pseudo = 'true' or @pseudo = '1')
            ]" />
            <xsl:choose>
              <xsl:when test="$datatypes">
                <h1>Matching Data Type(s):</h1>
                <xsl:for-each select="$datatypes">
                  <xsl:comment>Processing datatype: <xsl:value-of select="@name"/></xsl:comment>
                </xsl:for-each>
                <xsl:apply-templates select="$datatypes" mode="list" />
              </xsl:when>
              <xsl:otherwise>
                <h1 class="error">No matching data type for "<xsl:value-of select="$datatypePrefix"/>"</h1>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>

          <!-- Keyword prefix (e.g., Player) without dot -->
          <xsl:when test="not(contains($expression, '.'))">
            <xsl:variable name="keywordPrefix" select="$expression" />
            <xsl:variable name="keywords" select="keyword[
              (not(@script) or @script='any' or $scripttype='any' or @script=$scripttype)
              and starts-with(@name, $keywordPrefix)
            ]" />
            <xsl:choose>
              <xsl:when test="$keywords">
                <h1>Matching Base Keyword(s):</h1>
                <xsl:for-each select="$keywords">
                  <xsl:comment>Processing keyword: <xsl:value-of select="@name"/></xsl:comment>
                </xsl:for-each>
                <xsl:apply-templates select="$keywords" mode="list" />
              </xsl:when>
              <xsl:otherwise>
                <h1 class="error">No matching base keyword for "<xsl:value-of select="$keywordPrefix"/>"</h1>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>

          <!-- Complex expression with dots (e.g., Player.blueprints or $PlayerShip.health) -->
          <xsl:otherwise>
            <xsl:call-template name="processComplexExpression">
              <xsl:with-param name="expression" select="$expression" />
            </xsl:call-template>
          </xsl:otherwise>

        </xsl:choose>
      </body>
    </html>
  </xsl:template>

  <!-- Template to process complex expressions (dot notation) -->
  <xsl:template name="processComplexExpression">
    <xsl:param name="expression" />
    <xsl:variable name="prefix" select="substring-before($expression, '.')" />
    <xsl:variable name="suffix" select="substring-after($expression, '.')" />

    <xsl:comment>Processing complex expression: <xsl:value-of select="$expression"/></xsl:comment>
    <xsl:choose>
      <!-- If no prefix (e.g., ".blueprints"), use all keywords/datatypes -->
      <xsl:when test="not($prefix)">
        <xsl:call-template name="evaluateDotExpression">
          <xsl:with-param name="basenodes" select="keyword|datatype" />
          <xsl:with-param name="suffix" select="$suffix" />
        </xsl:call-template>
      </xsl:when>
      <!-- Prefix exists (e.g., "Player.blueprints" or "$PlayerShip.health") -->
      <xsl:otherwise>
        <xsl:variable name="basenodes" select="keyword[$prefix = @name] | datatype[starts-with($prefix, '$') and substring($prefix, 2) = @name]" />
        <xsl:comment>Found <xsl:value-of select="count($basenodes)"/> base nodes for prefix: <xsl:value-of select="$prefix"/></xsl:comment>
        <xsl:choose>
          <xsl:when test="not($basenodes)">
            <h1 class="error">
              Base "<xsl:value-of select="$prefix"/>" not recognized.
              <xsl:if test="starts-with($prefix, '$')">
                Data type "<xsl:value-of select="substring($prefix, 2)"/>" not found.
              </xsl:if>
            </h1>
          </xsl:when>
          <xsl:otherwise>
            <xsl:call-template name="evaluateDotExpression">
              <xsl:with-param name="basenodes" select="$basenodes" />
              <xsl:with-param name="suffix" select="$suffix" />
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Template to evaluate dot expressions recursively -->
  <xsl:template name="evaluateDotExpression">
    <xsl:param name="basenodes" />
    <xsl:param name="suffix" />
    <xsl:comment>Evaluating dot expression with <xsl:value-of select="count($basenodes)"/> base nodes, suffix: <xsl:value-of select="$suffix"/></xsl:comment>
    <xsl:choose>
      <xsl:when test="not($suffix)">
        <!-- No more dots, show matching base nodes -->
        <xsl:if test="$basenodes">
          <h1>Matching Nodes:</h1>
          <xsl:apply-templates select="$basenodes" mode="list" />
        </xsl:if>
        <xsl:if test="not($basenodes)">
          <h1 class="error">No matching nodes found for this expression</h1>
        </xsl:if>
      </xsl:when>
      <xsl:otherwise>
        <!-- Find properties matching the next part of the suffix -->
        <xsl:variable name="nextPart" select="substring-before($suffix, '.')" />
        <xsl:variable name="remainingSuffix" select="substring-after($suffix, '.')" />
        <xsl:variable name="propertyMatches" select="$basenodes/property[
          starts-with(@name, $nextPart)
        ]" />
        <xsl:comment>Found <xsl:value-of select="count($propertyMatches)"/> property matches for <xsl:value-of select="$nextPart"/></xsl:comment>
        <xsl:choose>
          <xsl:when test="not($propertyMatches)">
            <h1 class="error">No matching property "<xsl:value-of select="$nextPart"/>" found</h1>
          </xsl:when>
          <xsl:otherwise>
            <xsl:if test="not($remainingSuffix)">
              <!-- Last part of the expression, show matching properties -->
              <h1>Properties Matching "<xsl:value-of select="$nextPart"/>"</h1>
              <xsl:apply-templates select="$propertyMatches/.." mode="list" />
            </xsl:if>
            <xsl:if test="$remainingSuffix">
              <!-- Recurse with new base nodes based on property types -->
              <xsl:variable name="newBaseNodes" select="datatype[@name = $propertyMatches[1]/@type]" />
              <xsl:comment>New base nodes for recursion: <xsl:value-of select="count($newBaseNodes)"/></xsl:comment>
              <xsl:call-template name="evaluateDotExpression">
                <xsl:with-param name="basenodes" select="$newBaseNodes" />
                <xsl:with-param name="suffix" select="$remainingSuffix" />
              </xsl:call-template>
            </xsl:if>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Template for listing keywords and datatypes -->
  <xsl:template match="keyword|datatype" mode="list">
    <table class="base">
      <tr>
        <td width="20%">
          <xsl:apply-templates select="." mode="description" />
          <xsl:if test="import and name(*[last()]) = 'import'">
            <p class="importfailure">
              Failed to import properties from <xsl:value-of select="import/@source" />
            </p>
          </xsl:if>
        </td>
        <td>
          <xsl:choose>
            <xsl:when test="property">
              <p>Properties:</p>
              <table class="properties">
                <xsl:apply-templates select="property">
                  <xsl:sort select="@name" order="ascending" data-type="text" test="$sort = 'true'" />
                </xsl:apply-templates>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <p>No properties</p>
            </xsl:otherwise>
          </xsl:choose>
        </td>
      </tr>
    </table>
  </xsl:template>

  <!-- Description templates for keywords and datatypes -->
  <xsl:template match="keyword" mode="description">
    <h2>
      <xsl:value-of select="@name" />
    </h2>
    <xsl:if test="@script='md'">
      <p class="scriptspecific">MD-specific</p>
    </xsl:if>
    <xsl:if test="@script='ai'">
      <p class="scriptspecific">AI-specific</p>
    </xsl:if>
    <p>
      <xsl:value-of select="@description" />
    </p>
    <xsl:if test="@type">
      <p>Type: <xsl:apply-templates select="@type" mode="datatyperef" /></p>
    </xsl:if>
  </xsl:template>

  <xsl:template match="datatype" mode="description">
    <h2>
      <a name="{@name}">
        <xsl:value-of select="@name" />
      </a>
    </h2>
    <xsl:if test="@suffix">
      <p>Default suffix: <xsl:value-of select="@suffix" /></p>
    </xsl:if>
    <xsl:if test="@pseudo='true' or @pseudo='1'">
      <p class="pseudodatatype">Pseudo data type</p>
    </xsl:if>
    <xsl:if test="@type">
      <p>Base type: <xsl:apply-templates select="@type" mode="datatyperef" /></p>
    </xsl:if>
    <xsl:variable name="derivedtypes" select="/*/datatype[@type = current()/@name]" />
    <xsl:if test="$derivedtypes">
      <p>Derived types:
        <xsl:for-each select="$derivedtypes">
          <xsl:if test="position() != 1">, </xsl:if>
          <xsl:apply-templates select="@name" mode="datatyperef" />
        </xsl:for-each>
      </p>
    </xsl:if>
  </xsl:template>
 
  <xsl:template match="property">
    <tr>
      <td width="20%" class="property">
        <span class="propertyname">
          <xsl:value-of select="@name" />
        </span>
      </td>
      <td width="10%" class="property">
        <xsl:if test="@type">
          <xsl:apply-templates select="@type" mode="datatyperef" />
        </xsl:if>
      </td>
      <td class="property">
        <xsl:if test="@result">
          <span class="comment">
            <xsl:value-of select="@result" />
          </span>
        </xsl:if>
      </td>
    </tr>
  </xsl:template>

  <xsl:template match="@name|@type" mode="datatyperef">
    <xsl:choose>
      <xsl:when test="name() = 'type' and /scriptproperties/datatype[@name = current() and (@pseudo = 'true' or @pseudo = '1')]">
        <a class="pseudodatatype" href="#{.}">
          <xsl:value-of select="." />
        </a>
      </xsl:when>
      <xsl:otherwise>
        <a class="datatype" href="#{.}">
          <xsl:value-of select="." />
        </a>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>