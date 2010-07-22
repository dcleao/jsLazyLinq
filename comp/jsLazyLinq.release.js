/*!  jsLazyLinq JavaScript framework, version 0.1.2
*  (c) 2010 Duarte Cunha Leão
*
*  jsLazyLinq is freely distributable under the terms of an MIT-style license.
*  For details, see the http://github.com/dcleao/jsLazyLinq
*--------------------------------------------------------------------------*/
(function(_){
	_.jsLazyLinq = {
		Version: '0.1.2'
	};

	var _slice = Array.prototype.slice,
		_break = {},
		_getGenerator;

	function isFunction(value){
		return typeof value === 'function';
	}

	function isArrayLike(value){
		return value && ((value instanceof Array) ||
						(typeof value.length === 'number' && // window has length and string has length
						typeof value !== 'string' &&
						typeof value !== 'function' &&
						!value.setTimeout));
	}

	function number_add(n1, n2){
		return n1 + n2;
	}

	function getKey(pair) {
		return pair.key;
	}

	function getValue(pair) {
		return pair.value;
	}

	function createMethodCall(name, args){

		function methodCall(o) {
			var m = o && o[name];
			return m ? m.apply(o, args): undefined;
		}

		return methodCall;
	}

	function qDo(iterator, context) {
		var index = 0;

		try {

			this._generate(function(value) {
				iterator.call(context, value, index++);
			});

		} catch (ex) {
			if (ex !== _break) {
				throw ex;
			}
		}

		return this;
	}
	
	function qGenerate(yield){
		if(this._yieldInterceptor){
			yield = this._yieldInterceptor(yield);
		}

		this._sourceGenerate.call(this._source, yield);
	}
	
	function qNullYield(value){
		throw _break;
	}
	
	// ---------------------------
	// Reducers
	function qToArray() {
		var result = [];
		this.Do(function(value){ result.push(value); });
		return result;
	}

	function qCount() {
		var count = 0;
		this.Do(function(){ count++; });
		return count;
	}

	function qExists() {
		var exists = false;
		this.Do(function() {
			exists = true;
			throw _break;
		});
		return exists;
	}

	function qAny() {
		var result = false;
		this.Do(function(value) {
			result = !!value;
			if(result){
				throw _break;
			}
		});
		return result;
	}

	function qAll() {
		var result = true;
		this.Do(function(value) {
			result = !!value;
			if(!result){
				throw _break;
			}
		});
		return result;
	}

	function qFirst() {
		var first;
		this.Do(function(value) {
			first = value;
			throw _break;
		});
		return first;
	}

	function qContains(value){
		var found = false;
		this.Do(function(value2) {
			if(value2 === value){
				found = true;
				throw _break;
			}
		});
		return found;
	}

	function qSum(){
		return this.Aggregate(0, number_add);
	}

	function qMax() {
		var result;
		this.Do(function(value) {
			if (result == null || value > result)
				result = value;
		});
		return result;
	}

	function qMin() {
		var result;
		this.Do(function(value) {
			if (result == null || value < result)
				result = value;
		});
		return result;
	}

	function qAggregate(memo, aggregator, context) {
		this.Do(function(value, index) {
			memo = aggregator.call(context, memo, value, index);
		});
		return memo;
	}

	// ----------------------------
	function qSelect(selector, context){
		return this._intercept(function(yield){
			
			function qSelectYield(value){
				yield( selector.call(context, value) );
			}

			return qSelectYield;
		});
	}
	
	function qSelectMany(selector, context){
		return this._intercept(function(yield){
			
			function qSelectManyYield(value){
				var values = selector.call(context, value);
				if (values != null){
					var query = $Q(values);
					if (query) {
						query._generate(yield);
					} else {
						yield( values );
					}
				}
			}

			return qSelectManyYield;
		});
	}
	
	function qWhere(predicate, context) {
		return this._intercept(function(yield){
			
			function qWhereYield(value){
				if(predicate.call(context, value)){
					yield( value );
				}
			}

			return qWhereYield;
		});
	}

	function qDistinct(keySelector, context) {
		return this._intercept(function(yield){
			
			var keys = {};
			
			function qDistinctYield(value){
				var key = keySelector ? keySelector.call(context, value) : value;
				key += ''; // convert to string
				if(!keys.hasOwnProperty(key)){
					keys[key] = true;
					yield( value );
				}
			}

			return qDistinctYield;
		});
	}
	
	function qFlatten(){
		return this._intercept(function(yield){
			
			function qFlattenYield(value){

				var query = $Q(value);
				if (query) {
					query._generate(qFlattenYield);
				} else {
					yield( value );
				}
			}

			return qFlattenYield;
		});
	}
	
	function qTakeWhile(predicate, context) {
		return this._intercept(function(yield){
			
			function qTakeWhileYield(value){
				if (!predicate.call(context, value)) {
					throw _break;
				}

				yield( value );
			}

			return qTakeWhileYield;
		});
	}
	
	function qTake(count) {
		return this._intercept(function(yield){
			
			if(count <= 0){
				return qNullYield;
			}
			
			function qTakeYield(value){
				yield( value );
				
				if (!(--count)) {
					throw _break;
				}
			}

			return qTakeYield;
		});
	}
	
	function qTakeLast(count) {
		if(count <= 0){
			return this._intercept(function(yield){
				return qNullYield;
			});
		}
		
		function qTakeLast_generate(yield){
			var a  = this.ToArray(),
				start = Math.max(a.length - count, 0),
				q = $Q(a.slice(start));
			
			q._generate(yield);
		}
		
		return new Query(qTakeLast_generate, this);
	}
	
	function qSkipWhile(predicate, context) {
		return this._intercept(function(yield){
			
			var skip = true;
			
			function qSkipWhileYield(value){
				if (skip){
					if(predicate.call(context, value)){
						return;
					}
					
					skip = false;
				}
				
				yield( value );
			}

			return qSkipWhileYield;
		});
	}
	
	function qSkip(count) {
		return this._intercept(function(yield){
			
			function qSkipYield(value){
				if (count > 0) {
					count--;
				} else {
					yield( value );
				}
			}

			return qSkipYield;
		});
	}
	
	function qSkipLast(count) {
		"qSkipLast_generate:nomunge";
		if(count <= 0){
			return this;
		}
		
		var me = this;

		function qSkipLast_generate(yield){
			var a = me.ToArray(),
				q = $Q(a.slice(0, -count));
			
			q._generate(yield);
		}
		
		return new Query(qSkipLast_generate);
	}
	
	function qConcat(){
		return qConcatList([this].concat(_slice.apply(arguments)));
	}
	
	function qUnion(){
		return qUnionList([this].concat(_slice.apply(arguments)));
	}
	
	function qGet(property) {
		return this.Select(function(o) { return o ? o[property] : undefined; });
	}
	
	function qGetExisting(property) {
		return this._intercept(function(yield){
			
			function qGetExistingYield(value){
				if (value && (property in value)) {
					yield( value[property] );
				}
			}

			return qGetExistingYield;
		});
	}
	
	function qCall(method /*, arg1, arg2, ...*/) {
		return this.Select(createMethodCall(method, _slice.call(arguments, 1)));
	}
	
	function qApply(method, args) {
		return this.Select(createMethodCall(method, args));
	}
	
	// For Hash-like
	function qKeys() {
		return this.Select(getKey);
	}
	
	function qValues() {
		return this.Select(getValue);
	}
	
	// ----------------------------
	// Static
	
	function qBreak(){
		return _break;
	}
	
	function qInit(params){

		if(params.breakSignal){
			_break = params.breakSignal;
		}

		if('getGenerator' in params){
			_getGenerator = params.getGenerator; // may be null
		}
	}
	
	function qConcatList(queries) {

		function qConcat_generate(yield){
			for(var i = 0, L = queries.length ; i < L ; i++){
				var q = $Q(queries[i]);
				if(!q){
					throw new Error("Cannot convert argument to Query.");
				}

				q._generate(yield);
			}
		}

		return new Query(qConcat_generate);
	}
	
	function qUnionList(queries, keySelector, context) {
		return qConcatList(queries).Distinct(keySelector, context);
	}
	
	function qArrayLikeGenerator(yield){
		for(var i = 0, L = this.length ; i < L ; i++){
			yield(this[i]);
		}
	}

	function $Q(thing, context) {
		if(thing) {
			if(thing instanceof Query){
				return thing;
			}

			if(isArrayLike(thing)){
				return new Query(qArrayLikeGenerator, thing);
			}

			if(isFunction(thing)){
				return new Query(thing, context);
			}

			if (_getGenerator){
				var gen = _getGenerator(thing, context);
				if(gen){
					return new Query(gen, thing);
				}
			}
		}
		return null;
	}

	// -----------------------------

	function Query(sourceGenerate, source, yieldInterceptor){

		this._sourceGenerate = sourceGenerate;
		this._source = source; // context

		if(yieldInterceptor){
			this._yieldInterceptor = yieldInterceptor;
		}
	}
	
	function copyDoubleCase(dest, source){
		for(var p in source){
			if(source.hasOwnProperty(p)){
				var v 	  = source[p],
					pc 	  = p.charAt(0),
					prest = p.substr(1);
				
				dest[pc.toLowerCase() + prest] = v;
				dest[pc.toUpperCase() + prest] = v;
			}
		}
	}
	
	Query.prototype = {

		_generate: 	qGenerate,

		_intercept: function(yieldInterceptor){
			return new Query(qGenerate, this, yieldInterceptor);
		},

		Do:	qDo
	};
	
	copyDoubleCase(Query.prototype, {
		// -----------------------
		// To leave the query
		each:		qDo,
		toArray:	qToArray,
		aggregate:	qAggregate,
		count:		qCount,
		exists:		qExists,
		any:		qAny,
		all: 	  	qAll,
		first: 		qFirst,
		contains:  	qContains,
		sum:		qSum,
		max:		qMax,
		min:		qMin,

		// -----------------------
		// To refine the query
		select: 		qSelect,
		selectMany: 	qSelectMany, 
		where: 			qWhere,
		distinct:		qDistinct,
		union:			qUnion,
		flatten: 		qFlatten, 
		take:			qTake,
		takeLast:		qTakeLast,
		takeWhile:		qTakeWhile,
		skip:			qSkip,
		skipLast:		qSkipLast,
		skipWhile:		qSkipWhile,
		concat: 		qConcat, 
		get: 			qGet, 
		getExisting: 	qGetExisting, 
		call: 			qCall,
		apply: 			qApply, 
		keys: 			qKeys,
		values: 		qValues
	});
	
	Query.$break = 
	Query.Break  = qBreak;
	
	copyDoubleCase(Query, {
		arrayLikeGenerator: qArrayLikeGenerator, // mainly for tests
		create:		$Q,
		init: 		qInit,
		concat:		qConcatList,
		union:		qUnionList
	});
	
	// ----------------------------

	// Global Exports
	_.Query = Query;
	_.$Q    = $Q;
})(this);