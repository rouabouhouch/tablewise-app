import {train} from './core.js';
self.onmessage=({data})=>{try{self.postMessage({result:train(data.dataset,data.options)});}catch(e){self.postMessage({error:e.message});}};
