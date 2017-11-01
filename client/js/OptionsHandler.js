export default class {
    constructor(){
        this.votes = 0;
        this.options = {};
    }
    
    addOption(id, name){
        this.options[id] = createOption(name);
        this.votes++;
    }
    
    removeOptionById(id){
        this.votes += Math.abs(this.options[id].votes) + 1;
        delete this.options[id];
    }
    
    get votes(){
        return this.votes;
    }
}

function createOption(name){
    return {name: name, votes: 0};
}