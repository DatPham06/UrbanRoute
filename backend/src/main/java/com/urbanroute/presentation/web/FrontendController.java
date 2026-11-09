package com.urbanroute.presentation.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {
    @GetMapping({"/login", "/admin/**", "/driver/**"})
    public String index() {
        return "forward:/index.html";
    }
}
