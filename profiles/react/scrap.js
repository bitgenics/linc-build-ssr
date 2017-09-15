const head = {
	title: {
		toString: () => 'The Title!\n'
	},
	style: {
		toString: () => 'I am fabulous!'
	}
}
const headTags = ['title', 'link', 'meta', 'style', 'script'];
const dynamicHeadToString = (head) => {
    const strArray = headTags.map((tag) => head[tag] && head[tag].toString());
    return strArray.reduce((previous, current) => (current ? previous + current : previous), '' );
}

console.log(dynamicHeadToString(head))