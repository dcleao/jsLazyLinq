/*  jsLinq JavaScript framework, version 0.1
*  (c) 2010 Duarte Cunha Leão
*
*  jsLinq is freely distributable under the terms of an MIT-style license.
*  For details, see the http://github.com/dcleao/jsLinq
*--------------------------------------------------------------------------*/
(function(_){
	Query.Init({
		breakSignal: $break,
		getGenerator: function(thing, context){
			return thing._each;
		}
	});
	
	// Extend prototype's Enumerable and its derived classes with queryAccessor
	function queryAccessor() {
		return new Query(this._each, this);
	}

	[
		Enumerable,
		Array.prototype,
		Hash.prototype,
		ObjectRange.prototype,
		Element.ClassNames.prototype
	].each(function(proto) {
		proto.query = queryAccessor;
	});
})(this);