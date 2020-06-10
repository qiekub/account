import React, { useState } from 'react';

import {
	AppBar,
	Tabs,
	Tab,
} from '@material-ui/core'


function Main() {
	const [value, setValue] = useState(0)

	const handleChange = (event, newValue) => {
		setValue(newValue)
	}

	return (
		<div>
			hello
		</div>
	)
}

export default Tabs