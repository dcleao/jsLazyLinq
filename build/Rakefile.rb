#  jsLazyLinq JavaScript framework,
#  (c) 2010 Duarte Cunha Leão
#
#  jsLazyLinq is freely distributable under the terms of an MIT-style license.
#  For details, see the http://github.com/dcleao/jsLazyLinq
#--------------------------------------------------------------------------

class TextRegionType
  # -----------------------------------------------------------------
  # empty hash stores TextRegions by its fullName
  @@regionsByFullName = {}
  @@reBegin = /^\s*\/\/\s*<(\w+)>/i
  
  def TextRegionType.getRegionType(fullName)
	regionType = @@regionsByFullName[fullName]
	if regionType == nil
		regionType = TextRegionType.new(fullName)
		@@regionsByFullName[fullName] = regionType
	end
	regionType
  end
  
  def TextRegionType.tryOpen(line, definedRegionNamesSet)
	if (line =~ @@reBegin) == nil
		return nil
	end
	
	regionType  = TextRegionType.getRegionType($1)
	
	defined = definedRegionNamesSet.has_key?(regionType.name)
	
	included = (defined == regionType.positive?)
	
	TextRegion.new(regionType, included)
  end
  
  # -----------------------------------------------------------------
  
  def initialize(fullName)
	@fullName = fullName
	
	# store the end region regexp, that will be used many times
    @reEnd = Regexp.new('^\s*\/\/\s*</' + fullName + '>', Regexp::IGNORECASE)
	
	if (fullName =~ /^not_(.+)$/i) != nil
		@name = $1
		@positive = false
	else
		@name = fullName
		@positive = true
	end
  end
  
  def fullName
	@fullName
  end
  
  def name
	@name
  end
  
  def positive?
	@positive
  end
  
  def closes?(line)
	(line =~ @reEnd) != nil
  end
end

class TextRegion
	def initialize(textRegionType, included)
		@textRegionType = textRegionType
		@included = included
	end
	
	def included?
		@included
	end
	
	def name
		@textRegionType.name
	end
	
	def positive?
		@textRegionType.positive?
	end
	  
	def closes?(line)
		@textRegionType.closes?(line)
	end
end


def processTextRegions(destFile, sourceFile, definedRegionNamesSet)
	
	openTextRegions = [];
	innerTextRegion = nil;
	
	fout = File.new(destFile, "w");
	
	IO.foreach(sourceFile){|line|
		outputLine = false
		
		if innerTextRegion == nil
			innerTextRegion = TextRegionType.tryOpen(line, definedRegionNamesSet)
			if innerTextRegion != nil
				openTextRegions << innerTextRegion
				puts "BEG region #{innerTextRegion.name} positive=#{innerTextRegion.positive?}"
				##puts "innerTextRegion=#{innerTextRegion} openTextRegions=#{openTextRegions.length}"
			else
				outputLine = true
			end
		else
			if innerTextRegion.closes?(line)
				puts "END region #{innerTextRegion.name} positive=#{innerTextRegion.positive?}"
				openTextRegions.pop()
				innerTextRegion = openTextRegions.last
				##puts "innerTextRegion=#{innerTextRegion} openTextRegions=#{openTextRegions.length}"
			else
				outputLine = innerTextRegion.included?
				
				if outputLine
					# check if opens
					newRegion = TextRegionType.tryOpen(line, definedRegionNamesSet)
					if newRegion != nil
						innerTextRegion = newRegion
						openTextRegions << innerTextRegion
						puts "BEG region #{innerTextRegion.name} positive=#{innerTextRegion.positive?}"
						##puts "innerTextRegion=#{innerTextRegion} openTextRegions=#{openTextRegions.length}"
						outputLine = false
					end
				end
			end
		end
		
		if outputLine
			fout.write(line)
		end
	}
	
	fout.close()
end

def compileJavaScript(destFile, cleanFile, sourceFile, jarFile, definedSymbols)
	
	processTextRegions(cleanFile, sourceFile, definedSymbols)
	
	if jarFile != nil and destFile != nil
		cmd = "java -jar \"#{jarFile}\" --charset utf-8 -v -o \"#{destFile}\" \"#{cleanFile}\""
		##puts cmd
	
		system( cmd )
		
		File.delete(cleanFile)
	end
end

baseDir        = File.dirname(__FILE__) + "/../"

jarFile        = "#{baseDir}build/lib/yuicompressor-2.4.2.jar"

sourceFile     = "#{baseDir}src/jsLazyLinq.js"
debugFile      = "#{baseDir}comp/jsLazyLinq.debug.js"
releaseFile    = "#{baseDir}comp/jsLazyLinq.release.js"
releaseMinFile = "#{baseDir}comp/jsLazyLinq.release.min.js"
releaseMinTempFile = "#{baseDir}comp/jsLazyLinq.release.min.temp.js"

# >> Debug file
definedSymbols = {"Debug" => true}
compileJavaScript(nil, debugFile, sourceFile, nil, definedSymbols)

# >> Release file
definedSymbols = {}
compileJavaScript(nil, releaseFile, sourceFile, nil, definedSymbols)

# >> ReleaseMin file
definedSymbols = {"YUIComp" => true}
compileJavaScript(releaseMinFile, releaseMinTempFile, sourceFile, jarFile, definedSymbols)


# >> prototype
sourceFile     = "#{baseDir}src/jsLazyLinq.prototype.js"
debugFile      = "#{baseDir}comp/jsLazyLinq.prototype.debug.js"
releaseMinFile = "#{baseDir}comp/jsLazyLinq.prototype.release.min.js"
releaseMinTempFile = "#{baseDir}comp/jsLazyLinq.prototype.release.min.temp.js"

# >> Debug file
definedSymbols = {"Debug" => true}
compileJavaScript(nil, debugFile, sourceFile, nil, definedSymbols)

# >> ReleaseMin file
definedSymbols = {"YUIComp" => true}
compileJavaScript(releaseMinFile, releaseMinTempFile, sourceFile, jarFile, definedSymbols)