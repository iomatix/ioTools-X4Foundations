<?xml version="1.0" encoding="utf-8" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >

  <!-- parameters -->
  <xsl:param name="expression" />
  <xsl:param name="scripttype" select="'any'" />
  <xsl:param name="sort" />

  <xsl:template match="/*">
    <html>
      <head>
        <title>Script Property Documentation</title>
        <link rel="stylesheet" type="text/css" href="scriptproperties.css"/>
      </head>
      <body>
        <xsl:choose>

          <xsl:when test="not($expression)">
            <!-- No expression entered: Show everything -->
            <h1>Base keywords:</h1>
            <xsl:apply-templates select="keyword[
                                 (not(@script) or @script='any' or $scripttype='any' or @script=$scripttype)
                                 ]" />
            <h1>Data types:</h1>
            <xsl:apply-templates select="datatype" />
          </xsl:when>

          <xsl:when test="not(contains($expression, '.')) and starts-with($expression, '$')">
            <!-- Variable without dot: Filter datatypes by prefix -->
            <xsl:variable name="datatypes" select="datatype[
                          ($expression = '$' or starts-with(@name, substring($expression, 2))) and not (@pseudo = 'true' or @pseudo = '1')
                          ]" />
            <xsl:if test="$datatypes">
              <h1>Matching data type(s):</h1>
              <xsl:apply-templates select="$datatypes" />
            </xsl:if>
            <xsl:if test="not($datatypes)">
              <h1 class="error">No matching data type</h1>
            </xsl:if>
          </xsl:when>

          <xsl:when test="not(contains($expression, '.'))">
            <!-- Keyword without dot: Filter keywords by prefix -->
            <xsl:variable name="keywords" select="keyword[
                          (not(@script) or @script='any' or $scripttype='any' or @script=$scripttype)
                          and starts-with(@name, $expression)
                          ]" />
            <xsl:if test="$keywords">
              <h1 class="error">Matching base keyword(s):</h1>
              <xsl:apply-templates select="$keywords" />
            </xsl:if>
            <xsl:if test="not($keywords)">
              <h1 class="error">No matching base keyword</h1>
            </xsl:if>
          </xsl:when>

          <xsl:otherwise>
            <!-- Keyword or datatype with dot: Evaluate recursively -->
            <xsl:variable name="prefix" select="substring-before($expression, '.')" />
            <xsl:if test="not($prefix)">
              <!-- Dot was entered as first character: Use all keywords/datatypes -->
              <xsl:call-template name="evalexpression">
                <xsl:with-param name="prefix" select="$prefix" />
                <xsl:with-param name="suffix" select="substring-after($expression, '.')" />
                <xsl:with-param name="basenodes" select="keyword|datatype" />
              </xsl:call-template>
            </xsl:if>
            <xsl:if test="$prefix">
              <xsl:variable name="basenodes" select="keyword[$prefix = @name] | datatype[$prefix = concat('$', @name)]" />
              <xsl:choose>
                <xsl:when test="not($basenodes) and starts-with($prefix, '$')">
                  <!-- Datatype filter provided but not found -->
                  <h1 class="error">
                    Data type &quot;<xsl:value-of select="substring($prefix, 2)" />&quot; not recognized.
                  </h1>
                </xsl:when>
                <xsl:when test="not($basenodes)">
                  <!-- Keyword filter provided but not found -->
                  <h1 class="error">
                    Base keyword &quot;<xsl:value-of select="$prefix" />&quot; not recognized.
                  </h1>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:call-template name="collectsupertypes">
                    <xsl:with-param name="prefix" select="$prefix" />
                    <xsl:with-param name="suffix" select="substring-after($expression, '.')" />
                    <xsl:with-param name="originalnodes" select="$basenodes" />
                  </xsl:call-template>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:if>
          </xsl:otherwise>

        </xsl:choose>
      </body>
    </html>
  </xsl:template>

  <!-- Recursively collect related datatypes before calling evalexpression -->
  <!-- e.g. for $destructible, find base type $component and derived type $container -->
  <xsl:template name="collectsupertypes">
    <xsl:param name="prefix" />
    <xsl:param name="suffix" />
    <xsl:param name="originalnodes" />
    <xsl:param name="collectednodes" select="/.." />
    <xsl:param name="currentnodes" select="$originalnodes" />
    <!--
    <p>
      [collectsupertypes] CURRENTNODES:
      <xsl:for-each select="$currentnodes">
        <xsl:value-of select="@name" />,
      </xsl:for-each>
      COLLECTEDNODES:
      <xsl:for-each select="$collectednodes">
        <xsl:value-of select="@name" />,
      </xsl:for-each>
    </p>
    -->
    <xsl:choose>
      <xsl:when test="not($currentnodes)">
        <!-- End of recursion, go to phase 2 -->
        <xsl:call-template name="collectderivedtypes">
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="collectednodes" select="$collectednodes" />
          <xsl:with-param name="currentnodes" select="$originalnodes" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:variable name="remainingnodes" select="$currentnodes[@name != $currentnodes[1]/@name]" />
        <xsl:variable name="foundsupernode" select="datatype[@name = $currentnodes[1]/@type]" />
        <xsl:call-template name="collectsupertypes">
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="originalnodes" select="$originalnodes" />
          <xsl:with-param name="collectednodes" select="$collectednodes | $currentnodes[1]" />
          <xsl:with-param name="currentnodes" select="$remainingnodes | $foundsupernode" />
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="collectderivedtypes">
    <xsl:param name="prefix" />
    <xsl:param name="suffix" />
    <xsl:param name="collectednodes" />
    <xsl:param name="currentnodes" />
    <!--
    <p>
      [collectderivedtypes] CURRENTNODES:
      <xsl:for-each select="$currentnodes">
        <xsl:value-of select="@name" />,
      </xsl:for-each>
      COLLECTEDNODES:
      <xsl:for-each select="$collectednodes">
        <xsl:value-of select="@name" />,
      </xsl:for-each>
    </p>
    -->
    <xsl:choose>
      <xsl:when test="not($currentnodes)">
        <!-- End of recursion, go to evaluation -->
        <xsl:call-template name="evalexpression">
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="basenodes" select="$collectednodes" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:variable name="remainingnodes" select="$currentnodes[@name != $currentnodes[1]/@name]" />
        <xsl:variable name="foundderivednodes" select="datatype[@type = $currentnodes[1]/@name]" />
        <xsl:call-template name="collectderivedtypes">
          <xsl:with-param name="prefix" select="$prefix" />
          <xsl:with-param name="suffix" select="$suffix" />
          <xsl:with-param name="collectednodes" select="$collectednodes | $currentnodes[1]" />
          <xsl:with-param name="currentnodes" select="$remainingnodes | $foundderivednodes" />
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="evalexpression">
    <xsl:param name="prefix" />
    <xsl:param name="suffix" />
    <xsl:param name="basenodes" />
    <xsl:variable name="exactmatchwithdot" select="$basenodes/property[starts-with($suffix, concat(@name, '.'))]" />
    <xsl:choose>
      <xsl:when test="$exactmatchwithdot">
        <!-- Found another dot, re-evaluate with adjusted prefix and suffix. -->
        <!-- Find new base nodes (based on type of found property) -->
        <xsl:choose>
          <xsl:when test="$exactmatchwithdot[1]/@type">
            <!-- Found property has a type, use it -->
            <xsl:call-template name="collectsupertypes">
              <xsl:with-param name="prefix" select="concat($prefix, '.', $exactmatchwithdot[1]/@name)" />
              <xsl:with-param name="suffix" select="substring($suffix, string-length($exactmatchwithdot[1]/@name) + 2)" />
              <xsl:with-param name="originalnodes" select="datatype[@name = $exactmatchwithdot[1]/@type]" />
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>
            <!-- No type specified for the found property, use all available types as base -->
            <xsl:call-template name="collectsupertypes">
              <xsl:with-param name="prefix" select="concat($prefix, '.', $exactmatchwithdot[1]/@name)" />
              <xsl:with-param name="suffix" select="substring($suffix, string-length($exactmatchwithdot[1]/@name) + 2)" />
              <xsl:with-param name="originalnodes" select="datatype" />
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>
        <!-- Keep only those keywords/datatypes that have a matching property -->
        <xsl:variable name="basefiltered" select="$basenodes[property[starts-with(@name, $suffix)]]" />
        <xsl:choose>
          <xsl:when test="not($basefiltered)">
            <!-- Node set doesn't contain matching property with prefix $suffix -->
            <h1 class="error">
              No matching property found.
            </h1>
          </xsl:when>
          <xsl:otherwise>
            <!-- Show base keywords/datatypes, filtered by prefix $suffix -->
            <xsl:if test="$basefiltered[name() = 'keyword']">
              <h1>
                Base keywords with matching properties:
              </h1>
              <xsl:apply-templates select="$basefiltered[name() = 'keyword']">
                <xsl:with-param name="filter" select="$suffix" />
              </xsl:apply-templates>
            </xsl:if>
            <xsl:if test="$basefiltered[name() = 'datatype']">
              <h1>
                Data types with matching properties:
              </h1>
              <xsl:apply-templates select="$basefiltered[name() = 'datatype']">
                <xsl:with-param name="filter" select="$suffix" />
              </xsl:apply-templates>
            </xsl:if>
            <!-- For a property that matches exactly, show resulting datatype -->
            <xsl:variable name="exactmatches" select="$basefiltered/property[@name = $suffix]" />
            <xsl:if test="$exactmatches">
              <h1>
                Resulting data type:
              </h1>
              <xsl:for-each select="$exactmatches">
                <xsl:apply-templates select="/*/datatype[@name = current()/@type]" />
              </xsl:for-each>
            </xsl:if>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="keyword|datatype">
    <xsl:param name="filter" />

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
              <p>
                Properties:
              </p>
              <table class="properties">
                <xsl:choose>
                  <xsl:when test="$sort">
                    <xsl:apply-templates select="property[not($filter) or starts-with(@name, $filter)]">
                      <xsl:sort select="@name" />
                    </xsl:apply-templates>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:apply-templates select="property[not($filter) or starts-with(@name, $filter)]" />
                  </xsl:otherwise>
                </xsl:choose>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <p>
                No properties
              </p>
            </xsl:otherwise>
          </xsl:choose>
        </td>
      </tr>
    </table>
  </xsl:template>

  <xsl:template match="keyword" mode="description">
    <h2>
      <xsl:value-of select="@name" />
    </h2>
    <xsl:if test="@script='md'">
      <p class="scriptspecific">
        MD-specific
      </p>
    </xsl:if>
    <xsl:if test="@script='ai'">
      <p class="scriptspecific">
        AI-specific
      </p>
    </xsl:if>
    <p>
      <xsl:value-of select="@description" />
    </p>
    <xsl:if test="@type">
      <p>
        Type: <xsl:apply-templates select="@type" mode="datatyperef" />
      </p>
    </xsl:if>
  </xsl:template>

  <xsl:template match="datatype" mode="description">
    <h2>
      <a name="{@name}">
        <xsl:value-of select="@name" />
      </a>
    </h2>
    <xsl:if test="@suffix">
      <p>
        Default suffix: <xsl:value-of select="@suffix" />
      </p>
    </xsl:if>
    <xsl:if test="@pseudo='true' or @pseudo='1'">
      <p class="pseudodatatype">
        Pseudo data type
      </p>
    </xsl:if>
    <xsl:if test="@type">
      <p>
        Base type:
        <xsl:apply-templates select="@type" mode="datatyperef" />
      </p>
    </xsl:if>
    <xsl:variable name="derivedtypes" select="/*/datatype[@type = current()/@name]" />
    <xsl:if test="$derivedtypes">
      <p>
        Derived types:
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
