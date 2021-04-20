import * as config from "../config.json";

export type Config = {
    identifier: string|string[];
    token: string;
    url: string;
    port: number;
    max_width: number;
    max_height: number;
};

const if_this_fails_to_compile_you_are_missing_something_in_your_config: Config = config;